"""
Vercel Serverless Function - CSaaS Client List
Lista los clientes provisionados y su estado actual
"""
from http.server import BaseHTTPRequestHandler
import json
import os
import sys
from datetime import datetime

# Agregar el directorio api al path
sys.path.insert(0, os.path.dirname(__file__))

try:
    from utils import get_cors_headers, is_host_allowed
except ImportError:
    def get_cors_headers(origin):
        allowed_origin = "null"
        return {
            "Access-Control-Allow-Origin": allowed_origin,
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
            "Vary": "Origin",
        }

    def is_host_allowed(host: str) -> bool:
        allowed = {h.strip().lower() for h in os.getenv("ALLOWED_HOSTS", "").split(",") if h.strip()}
        normalized = (host or "").split(":")[0].strip().lower()
        vercel_url = os.getenv("VERCEL_URL", "").strip().lower()
        return bool(normalized and (normalized in allowed or (vercel_url and normalized == vercel_url)))

try:
    from config import CSaaSConfig
    CONFIG_AVAILABLE = True
except ImportError:
    CONFIG_AVAILABLE = False

    class CSaaSConfig:
        PROVISIONED_CLIENTS = {}

try:
    from logger import protection_logger
    LOGGING_AVAILABLE = True
except ImportError:
    LOGGING_AVAILABLE = False

    class DummyLogger:
        def info(self, *args, **kwargs):
            pass

    protection_logger = DummyLogger()


class handler(BaseHTTPRequestHandler):
    """Handler para listar clientes CSaaS"""

    def _reject_invalid_host(self) -> bool:
        host = self.headers.get("Host", "")
        if not is_host_allowed(host):
            self._send_json({
                "status": "error",
                "message": "Host no autorizado",
                "host": host
            }, 400)
            return True
        return False

    def _set_headers(self, status_code=200, content_type="application/json"):
        self.send_response(status_code)
        self.send_header("Content-Type", content_type)
        origin = self.headers.get("Origin")
        for key, value in get_cors_headers(origin).items():
            self.send_header(key, value)
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Frame-Options", "DENY")
        self.send_header("Content-Security-Policy", "frame-ancestors 'none'")
        self.send_header("Referrer-Policy", "no-referrer")
        self.send_header("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload")
        self.send_header("Permissions-Policy", "geolocation=(), microphone=(), camera=(), payment=(), usb=(), interest-cohort=()")
        self.end_headers()

    def _send_json(self, data, status_code=200):
        self._set_headers(status_code)
        self.wfile.write(json.dumps(data, ensure_ascii=False).encode("utf-8"))

    def do_OPTIONS(self):
        if self._reject_invalid_host():
            return
        self._send_json({"message": "OK"}, 200)

    def do_GET(self):
        if self._reject_invalid_host():
            return

        clients = []
        for client_id, info in CSaaSConfig.PROVISIONED_CLIENTS.items():
            created_at = info.get("created_at")
            created_iso = None
            if isinstance(created_at, (int, float)):
                created_iso = datetime.utcfromtimestamp(created_at).isoformat() + "Z"
            elif isinstance(created_at, str):
                created_iso = created_at

            raw_status = info.get("status", "unknown")
            status = "pending" if raw_status in ["pending_ssl", "pending_activation"] else raw_status

            clients.append({
                "id": client_id,
                "hostname": info.get("subdomain"),
                "status": status,
                "ssl_status": info.get("ssl_status", "unknown"),
                "created_at": created_iso or datetime.utcnow().isoformat() + "Z",
                "verification_errors": info.get("verification_errors") or [],
            })

        clients.sort(key=lambda c: c.get("created_at") or "", reverse=True)

        if LOGGING_AVAILABLE:
            protection_logger.info(
                "Listado de clientes CSaaS",
                total_clients=len(clients)
            )

        self._send_json({
            "status": "ok",
            "total_clients": len(clients),
            "clients": clients
        }, 200)
