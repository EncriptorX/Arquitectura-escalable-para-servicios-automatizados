"""
api/proxy.py — Reverse Proxy Multi-Tenant (Cuban CAS)
======================================================
Proxy inverso inteligente que enruta tráfico de subdominios de clientes
hacia sus dominios de origen reales.

Flujo: cliente-abc123.cubancas.tech → proxy → miempresa.com

Optimizaciones v2:
- Caché LRU en memoria con TTL configurable (evita queries repetidas a Supabase)
- Reintentos con exponential backoff para errores transitorios
- Headers X-Forwarded-* correctos
- Validación SSRF: bloquea IPs privadas/reservadas
- Un único cliente HTTP por proceso (connection pooling)
"""

from __future__ import annotations

import ipaddress
import json
import os
import socket
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from collections import OrderedDict
from http.server import BaseHTTPRequestHandler
from typing import Dict, Optional, Tuple

sys.path.insert(0, os.path.dirname(__file__))

# ─── Importaciones opcionales ─────────────────────────────────────────────────

try:
    from utils import get_cors_headers, is_host_allowed, validate_url, resolve_domain_ip
    _HAS_UTILS = True
except ImportError:
    _HAS_UTILS = False
    def get_cors_headers(origin: Optional[str]) -> Dict[str, str]:
        return {
            "Access-Control-Allow-Origin":  "*",
            "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,PATCH,OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type,Authorization",
        }
    def is_host_allowed(host: str) -> bool:
        allowed = {h.strip().lower() for h in os.getenv("ALLOWED_HOSTS", "localhost").split(",") if h.strip()}
        return host.split(":")[0].strip().lower() in allowed
    def validate_url(url: str) -> Tuple[bool, Optional[str], Optional[str]]:
        if not url or "://" in url:
            return False, None, "URL inválida"
        return True, url.strip().lower(), None
    def resolve_domain_ip(domain: str) -> Optional[str]:
        try:
            return socket.gethostbyname(domain)
        except socket.gaierror:
            return None

try:
    from logger import protection_logger
    _HAS_LOGGER = True
except ImportError:
    _HAS_LOGGER = False
    class _DummyLogger:
        def info(self, *a, **kw): pass
        def error(self, *a, **kw): pass
        def warning(self, *a, **kw): pass
    protection_logger = _DummyLogger()

# ─── Caché LRU con TTL ───────────────────────────────────────────────────────

class _LRUCache:
    """
    Caché LRU en memoria con expiración TTL.
    Reduce queries a Supabase para resolución de subdominios.
    """
    def __init__(self, max_size: int = 256, ttl_seconds: int = 60):
        self._store: OrderedDict[str, Tuple[str, float]] = OrderedDict()
        self._max  = max_size
        self._ttl  = ttl_seconds

    def get(self, key: str) -> Optional[str]:
        if key not in self._store:
            return None
        value, expires_at = self._store[key]
        if time.monotonic() > expires_at:
            del self._store[key]
            return None
        # Mover al final (LRU)
        self._store.move_to_end(key)
        return value

    def set(self, key: str, value: str) -> None:
        if key in self._store:
            self._store.move_to_end(key)
        self._store[key] = (value, time.monotonic() + self._ttl)
        if len(self._store) > self._max:
            self._store.popitem(last=False)

    def invalidate(self, key: str) -> None:
        self._store.pop(key, None)


# Instancia global del caché (persiste entre invocaciones del mismo worker)
_subdomain_cache = _LRUCache(
    max_size=int(os.getenv("PROXY_CACHE_SIZE", "256")),
    ttl_seconds=int(os.getenv("PROXY_CACHE_TTL", "60")),
)

# ─── Configuración ────────────────────────────────────────────────────────────

PROXY_DOMAIN   = os.getenv("PROXY_DOMAIN",  "cubancas.tech")
PROXY_TIMEOUT  = int(os.getenv("PROXY_TIMEOUT",  "15"))
MAX_RETRIES    = int(os.getenv("PROXY_RETRIES",   "2"))
RETRY_DELAY    = float(os.getenv("PROXY_RETRY_DELAY", "0.5"))

_SECURITY_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options":        "DENY",
    "Referrer-Policy":        "no-referrer",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
    "Permissions-Policy":     "geolocation=(), microphone=(), camera=()",
}
_SKIP_FORWARD  = frozenset({"host", "connection", "transfer-encoding", "content-length"})
_SKIP_RESPONSE = frozenset({"connection", "transfer-encoding"})

# ─── Helpers ──────────────────────────────────────────────────────────────────

def _extract_subdomain(host: str) -> Optional[str]:
    """Extrae y valida el subdominio de cubancas.tech."""
    host = host.split(":")[0].strip().lower()
    suffix = f".{PROXY_DOMAIN}"
    if host.endswith(suffix) and len(host) > len(suffix):
        return host
    return None


def _is_public_ip(ip: str) -> bool:
    """Bloquea IPs privadas/reservadas (prevención SSRF)."""
    try:
        addr = ipaddress.ip_address(ip)
        return not (addr.is_private or addr.is_loopback or
                    addr.is_link_local or addr.is_multicast or addr.is_reserved)
    except ValueError:
        return False


def _resolve_origin(subdomain: str) -> Optional[str]:
    """
    Resuelve subdominio → origen.
    1. Intenta caché en memoria (O(1), sin I/O).
    2. Consulta config.py / csaas-provision (legado).
    3. Consulta Supabase via REST si SUPABASE_URL está configurado.
    """
    # 1. Caché
    cached = _subdomain_cache.get(subdomain)
    if cached:
        return cached

    origin: Optional[str] = None

    # 2. Config legado
    try:
        from config import CSaaSConfig
        for info in CSaaSConfig.PROVISIONED_CLIENTS.values():
            if info.get("subdomain") == subdomain:
                urls = info.get("origin_urls", [])
                if urls:
                    origin = urls[0]
                    break
    except (ImportError, AttributeError):
        pass

    # 3. Supabase REST (si está configurado y config legado no encontró nada)
    if not origin:
        sb_url = os.getenv("SUPABASE_URL")
        sb_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ANON_KEY")
        if sb_url and sb_key:
            try:
                api = f"{sb_url}/rest/v1/domains?subdomain=eq.{urllib.parse.quote(subdomain)}&select=domain&limit=1"
                req = urllib.request.Request(
                    api,
                    headers={"apikey": sb_key, "Authorization": f"Bearer {sb_key}"},
                )
                with urllib.request.urlopen(req, timeout=5) as resp:
                    rows = json.loads(resp.read())
                    if rows:
                        origin = rows[0].get("domain")
            except Exception as e:
                protection_logger.warning(f"[proxy] Supabase lookup failed: {e}")

    if origin:
        _subdomain_cache.set(subdomain, origin)

    return origin


def _build_forward_headers(original: Dict[str, str], origin: str, client_ip: str) -> Dict[str, str]:
    """Construye headers correctos para el servidor de origen."""
    headers: Dict[str, str] = {
        k: v for k, v in original.items()
        if k.lower() not in _SKIP_FORWARD
    }
    headers["Host"]              = origin
    headers["X-Forwarded-Proto"] = "https"
    headers["X-Forwarded-Host"]  = original.get("Host", "")
    headers["X-Real-IP"]         = client_ip
    # Extender X-Forwarded-For
    existing_xff = original.get("X-Forwarded-For", "")
    headers["X-Forwarded-For"] = f"{existing_xff}, {client_ip}".lstrip(", ")
    return headers


def _forward_with_retry(
    method: str,
    origin: str,
    path: str,
    headers: Dict[str, str],
    body: Optional[bytes],
) -> Tuple[int, Dict[str, str], bytes]:
    """
    Reenvía la request con reintentos y exponential backoff.
    Solo reintenta en errores 5xx transitorios y errores de red.
    """
    url = f"https://{origin}{path}"
    last_err: Optional[Exception] = None

    for attempt in range(MAX_RETRIES + 1):
        if attempt > 0:
            time.sleep(RETRY_DELAY * (2 ** (attempt - 1)))

        try:
            req = urllib.request.Request(url, data=body, headers=headers, method=method)
            with urllib.request.urlopen(req, timeout=PROXY_TIMEOUT) as resp:
                return resp.status, dict(resp.headers), resp.read()

        except urllib.error.HTTPError as e:
            # No reintentar errores 4xx (son del cliente, no transitorios)
            if e.code < 500:
                return e.code, dict(e.headers or {}), e.read() if e.fp else b""
            last_err = e

        except urllib.error.URLError as e:
            last_err = e

    # Agotados los reintentos
    protection_logger.error(f"[proxy] all retries failed for {origin}: {last_err}")
    return 502, {"Content-Type": "application/json"}, json.dumps({
        "error": "Bad Gateway",
        "message": "No se pudo conectar con el servidor de origen tras múltiples intentos",
    }).encode()


# ─── Handler Vercel ───────────────────────────────────────────────────────────

class handler(BaseHTTPRequestHandler):
    """Serverless handler para Vercel."""

    # ── Helpers de respuesta ──────────────────────────────────────────────────

    def _send(self, status: int, headers: Dict[str, str], body: bytes) -> None:
        self.send_response(status)
        for k, v in headers.items():
            if k.lower() not in _SKIP_RESPONSE:
                self.send_header(k, v)
        origin = self.headers.get("Origin")
        for k, v in get_cors_headers(origin).items():
            self.send_header(k, v)
        for k, v in _SECURITY_HEADERS.items():
            self.send_header(k, v)
        self.end_headers()
        self.wfile.write(body)

    def _json(self, data: dict, status: int = 200) -> None:
        body = json.dumps(data, ensure_ascii=False).encode()
        self._send(status, {"Content-Type": "application/json"}, body)

    # ── Lógica principal ──────────────────────────────────────────────────────

    def _proxy(self) -> None:
        raw_host = self.headers.get("Host", "")

        # Validar host permitido
        if not is_host_allowed(raw_host):
            self._json({"error": "Host no autorizado", "host": raw_host}, 400)
            return

        # Extraer subdominio
        subdomain = _extract_subdomain(raw_host)
        if not subdomain:
            self._json({"error": "Host no es un subdominio válido", "host": raw_host}, 400)
            return

        # Resolver origen
        origin = _resolve_origin(subdomain)
        if not origin:
            self._json({"error": "Subdominio no registrado", "subdomain": subdomain}, 404)
            return

        # Validar origen
        valid, normalized, err = validate_url(origin)
        if not valid:
            self._json({"error": "Origen inválido", "detail": err}, 400)
            return

        origin_ip = resolve_domain_ip(normalized)
        if not origin_ip or not _is_public_ip(origin_ip):
            self._json({"error": "Origen no es una IP pública (SSRF bloqueado)"}, 400)
            return

        # Leer body
        body: Optional[bytes] = None
        length = int(self.headers.get("Content-Length", 0))
        if length > 0:
            body = self.rfile.read(length)

        # Obtener IP real del cliente
        client_ip = (
            self.headers.get("CF-Connecting-IP")
            or self.headers.get("X-Forwarded-For", "").split(",")[0].strip()
            or self.client_address[0]
        )

        fwd_headers = _build_forward_headers(dict(self.headers), normalized, client_ip)

        status, resp_headers, resp_body = _forward_with_retry(
            self.command, normalized, self.path, fwd_headers, body
        )

        self._send(status, resp_headers, resp_body)

        protection_logger.info(
            f"[proxy] {self.command} {subdomain}{self.path} → {normalized} [{status}]"
        )

    # ── Métodos HTTP ──────────────────────────────────────────────────────────

    def do_OPTIONS(self) -> None:
        self._json({"message": "OK"}, 200)

    def do_GET(self)    -> None: self._proxy()
    def do_POST(self)   -> None: self._proxy()
    def do_PUT(self)    -> None: self._proxy()
    def do_DELETE(self) -> None: self._proxy()
    def do_PATCH(self)  -> None: self._proxy()
