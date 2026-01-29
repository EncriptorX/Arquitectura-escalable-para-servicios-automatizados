"""
Vercel Serverless Function - Reverse Proxy HTTP/HTTPS
Backend proxy inteligente que reenvía solicitudes al dominio real del cliente

ARQUITECTURA:
- Lee el header Host de cada request entrante
- Identifica el subdominio cliente-<id>.suncarsrl.com
- Resuelve dinámicamente el dominio real del cliente usando un mapa en memoria
- Reenvía la solicitud HTTP/HTTPS al dominio real del cliente
- Mantiene headers correctos (Host, X-Forwarded-For, X-Forwarded-Proto)

FLUJO:
1. Request llega a cliente-abc123.suncarsrl.com
2. Proxy identifica el subdominio
3. Busca el dominio real en el mapa (ej: www.cliente.com)
4. Reenvía la request a www.cliente.com
5. Devuelve la respuesta al cliente original
"""
from http.server import BaseHTTPRequestHandler
import json
import os
import sys
import urllib.request
import urllib.parse
import urllib.error
import ipaddress
import socket
from typing import Optional, Dict, Tuple

# Agregar el directorio api al path
sys.path.insert(0, os.path.dirname(__file__))

try:
    from utils import get_cors_headers
except ImportError:
    def get_cors_headers(origin):
        allowed_origins = {
            item.strip().lower()
            for item in os.getenv("ALLOWED_ORIGINS", "").split(",")
            if item.strip()
        }
        normalized_origin = (origin or "").strip().lower()
        allowed_origin = normalized_origin if normalized_origin in allowed_origins else "null"
        return {
            "Access-Control-Allow-Origin": allowed_origin,
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
            "Vary": "Origin",
        }

try:
    from logger import protection_logger, log_api_error
    LOGGING_AVAILABLE = True
except ImportError:
    LOGGING_AVAILABLE = False
    class DummyLogger:
        def info(self, *args, **kwargs): pass
        def error(self, *args, **kwargs): pass
    protection_logger = DummyLogger()
    log_api_error = lambda *args, **kwargs: None

try:
    from utils import validate_url, resolve_domain_ip
    UTILS_AVAILABLE = True
except ImportError:
    UTILS_AVAILABLE = False
    def validate_url(url: str):
        if not url or not isinstance(url, str):
            return False, None, "URL vacía o inválida"
        if "://" in url or "/" in url or "?" in url or "#" in url or ":" in url:
            return False, None, "Formato de dominio inválido"
        return True, url.strip().lower(), None

    def resolve_domain_ip(domain: str) -> Optional[str]:
        try:
            return socket.gethostbyname(domain)
        except socket.gaierror:
            return None

# ===============================
# Configuración del Proxy
# ===============================
class ProxyConfig:
    """Configuración del proxy"""
    TIMEOUT = 30  # Timeout para requests al origin
    MAX_RETRIES = 2  # Reintentos en caso de error
    
    # Mapa en memoria: subdominio -> dominio_real_cliente
    # Este mapa se sincroniza con CSaaSConfig.PROVISIONED_CLIENTS
    SUBDOMAIN_MAP = {}  # {subdomain: origin_url}


# ===============================
# Utilidades del Proxy
# ===============================
def extract_subdomain(host: str) -> Optional[str]:
    """
    Extrae el subdominio del header Host
    
    Args:
        host: Header Host (ej: cliente-abc123.suncarsrl.com)
    
    Returns:
        Subdominio completo o None si no es válido
    """
    if not host:
        return None
    
    # Remover puerto si existe
    host = host.split(':')[0]
    
    # Verificar que sea un subdominio de suncarsrl.com
    if not host.endswith('.suncarsrl.com'):
        return None
    
    return host


def get_origin_for_subdomain(subdomain: str) -> Optional[str]:
    """
    Obtiene el dominio real del cliente para un subdominio
    
    Args:
        subdomain: Subdominio (ej: cliente-abc123.suncarsrl.com)
    
    Returns:
        Dominio real del cliente o None si no existe
    """
    # Buscar en el mapa en memoria
    origin = ProxyConfig.SUBDOMAIN_MAP.get(subdomain)
    
    if origin:
        return origin
    
    # Si no está en el mapa, intentar sincronizar con CSaaSConfig
    try:
        from config import CSaaSConfig
        
        # Buscar en PROVISIONED_CLIENTS
        for client_key, client_info in CSaaSConfig.PROVISIONED_CLIENTS.items():
            if client_info.get('subdomain') == subdomain:
                origin_urls = client_info.get('origin_urls', [])
                if origin_urls:
                    origin = origin_urls[0]
                    # Actualizar mapa en memoria
                    ProxyConfig.SUBDOMAIN_MAP[subdomain] = origin
                    return origin
    except ImportError:
        pass
    
    return None


def forward_request(
    method: str,
    origin_url: str,
    path: str,
    headers: Dict[str, str],
    body: Optional[bytes] = None
) -> Tuple[int, Dict[str, str], bytes]:
    """
    Reenvía una solicitud HTTP/HTTPS al dominio real del cliente
    
    Args:
        method: Método HTTP (GET, POST, etc.)
        origin_url: Dominio real del cliente (ej: www.cliente.com)
        path: Path de la solicitud (ej: /api/users)
        headers: Headers de la solicitud original
        body: Body de la solicitud (opcional)
    
    Returns:
        Tupla (status_code, response_headers, response_body)
    """
    # Construir URL completa
    # Usar HTTPS por defecto para seguridad
    full_url = f"https://{origin_url}{path}"
    
    origin_headers = _build_origin_headers(headers, origin_url)
    
    # Realizar request al origin
    try:
        req = urllib.request.Request(
            full_url,
            data=body,
            headers=origin_headers,
            method=method
        )
        
        with urllib.request.urlopen(req, timeout=ProxyConfig.TIMEOUT) as response:
            status_code = response.status
            response_headers = dict(response.headers)
            response_body = response.read()
            
            return status_code, response_headers, response_body
    
    except urllib.error.HTTPError as e:
        # El origin devolvió un error HTTP
        status_code = e.code
        response_headers = dict(e.headers) if e.headers else {}
        response_body = e.read() if e.fp else b''
        
        return status_code, response_headers, response_body
    
    except urllib.error.URLError as e:
        # Error de conexión al origin
        error_msg = f"Error conectando con el origin: {str(e.reason)}"
        
        if LOGGING_AVAILABLE:
            log_api_error("proxy", error_msg, "URLError", origin=origin_url)
        
        return 502, {'Content-Type': 'application/json'}, json.dumps({
            "error": "Bad Gateway",
            "message": "No se pudo conectar con el servidor de origen",
            "origin": origin_url
        }).encode('utf-8')
    
    except Exception as e:
        # Error inesperado
        error_msg = f"Error en proxy: {str(e)}"
        
        if LOGGING_AVAILABLE:
            log_api_error("proxy", error_msg, type(e).__name__, origin=origin_url)
        
        return 500, {'Content-Type': 'application/json'}, json.dumps({
            "error": "Internal Server Error",
            "message": "Error interno del proxy",
            "details": str(e)
        }).encode('utf-8')


def _build_origin_headers(request_headers: Dict[str, str], origin_url: str) -> Dict[str, str]:
    """Prepara los headers que se reenviarán al origin"""
    origin_headers: Dict[str, str] = {}

    for key, value in request_headers.items():
        key_lower = key.lower()
        if key_lower in ['host', 'connection', 'content-length']:
            continue
        origin_headers[key] = value

    origin_headers['Host'] = origin_url
    origin_headers['X-Forwarded-Proto'] = 'https'
    if 'X-Forwarded-For' not in origin_headers:
        origin_headers['X-Forwarded-For'] = request_headers.get('X-Real-IP', '0.0.0.0')

    return origin_headers


def _is_public_ip(ip: str) -> bool:
    try:
        addr = ipaddress.ip_address(ip)
        return not (
            addr.is_private
            or addr.is_loopback
            or addr.is_link_local
            or addr.is_multicast
            or addr.is_reserved
        )
    except ValueError:
        return False


# ===============================
# Handler de Vercel
# ===============================
class handler(BaseHTTPRequestHandler):
    """Handler para Vercel Serverless Function - Reverse Proxy"""
    
    def _send_response(self, status_code: int, headers: Dict[str, str], body: bytes):
        """Envía respuesta HTTP"""
        self.send_response(status_code)
        
        # Enviar headers de la respuesta
        for key, value in headers.items():
            # Excluir headers que no deben reenviarse
            if key.lower() in ['connection', 'transfer-encoding']:
                continue
            
            self.send_header(key, value)
        
        # Agregar CORS headers
        origin = self.headers.get('Origin')
        for key, value in get_cors_headers(origin).items():
            self.send_header(key, value)
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('X-Frame-Options', 'DENY')
        self.send_header('Content-Security-Policy', "frame-ancestors 'none'")
        self.send_header('Referrer-Policy', 'no-referrer')
        self.send_header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')
        self.send_header('Permissions-Policy', 'geolocation=(), microphone=(), camera=(), payment=(), usb=(), interest-cohort=()')
        
        self.end_headers()
        self.wfile.write(body)
    
    def _send_json(self, data: Dict, status_code: int = 200):
        """Envía respuesta JSON"""
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json')
        origin = self.headers.get('Origin')
        for key, value in get_cors_headers(origin).items():
            self.send_header(key, value)
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('X-Frame-Options', 'DENY')
        self.send_header('Content-Security-Policy', "frame-ancestors 'none'")
        self.send_header('Referrer-Policy', 'no-referrer')
        self.send_header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')
        self.send_header('Permissions-Policy', 'geolocation=(), microphone=(), camera=(), payment=(), usb=(), interest-cohort=()')
        self.end_headers()
        self.wfile.write(json.dumps(data, ensure_ascii=False).encode('utf-8'))
    
    def do_OPTIONS(self):
        """Maneja preflight CORS"""
        self._send_json({"message": "OK"}, 200)
    
    def _handle_proxy_request(self):
        """Maneja una solicitud de proxy"""
        # Extraer información de la solicitud
        host = self.headers.get('Host', '')
        path = self.path
        method = self.command
        
        # Extraer subdominio
        subdomain = extract_subdomain(host)
        
        if not subdomain:
            self._send_json({
                "error": "Invalid Host",
                "message": "El header Host no es un subdominio válido de suncarsrl.com",
                "host": host
            }, 400)
            return
        
        # Obtener dominio real del cliente
        origin_url = get_origin_for_subdomain(subdomain)
        
        if not origin_url:
            self._send_json({
                "error": "Origin Not Found",
                "message": f"No se encontró un dominio de origen para el subdominio: {subdomain}",
                "subdomain": subdomain,
                "hint": "El subdominio no está registrado en el sistema CSaaS"
            }, 404)
            return

        valid, normalized_origin, error = validate_url(origin_url)
        if not valid:
            self._send_json({
                "error": "Invalid Origin",
                "message": f"Dominio de origen inválido: {error}",
                "origin": origin_url
            }, 400)
            return

        origin_ip = resolve_domain_ip(normalized_origin)
        if not origin_ip or not _is_public_ip(origin_ip):
            self._send_json({
                "error": "Unsafe Origin",
                "message": "El dominio de origen no es público o no se pudo resolver",
                "origin": normalized_origin
            }, 400)
            return

        origin_url = normalized_origin
        
        # Leer body si existe
        body = None
        content_length = int(self.headers.get('Content-Length', 0))
        if content_length > 0:
            body = self.rfile.read(content_length)
        
        # Reenviar solicitud al origin
        status_code, response_headers, response_body = forward_request(
            method=method,
            origin_url=origin_url,
            path=path,
            headers=dict(self.headers),
            body=body
        )
        
        # Enviar respuesta al cliente
        self._send_response(status_code, response_headers, response_body)
        
        # Log de la operación
        if LOGGING_AVAILABLE:
            protection_logger.info(
                f"Proxy request: {subdomain} -> {origin_url}{path}",
                method=method,
                status_code=status_code,
                subdomain=subdomain,
                origin=origin_url
            )
    
    def do_GET(self):
        """Maneja solicitudes GET"""
        self._handle_proxy_request()
    
    def do_POST(self):
        """Maneja solicitudes POST"""
        self._handle_proxy_request()
    
    def do_PUT(self):
        """Maneja solicitudes PUT"""
        self._handle_proxy_request()
    
    def do_DELETE(self):
        """Maneja solicitudes DELETE"""
        self._handle_proxy_request()
    
    def do_PATCH(self):
        """Maneja solicitudes PATCH"""
        self._handle_proxy_request()
