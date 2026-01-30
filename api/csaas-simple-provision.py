"""
Vercel Serverless Function - CSaaS Simple Provisioning (Plan Gratuito)
Sistema simplificado de protección perimetral usando CNAME directo con proxy

ARQUITECTURA SIMPLIFICADA (Sin Custom Hostnames):
1. Cliente envía formulario con nombre/ID y URL a proteger
2. Generar subdominio único bajo cubansaas.tech (ej: cliente123.cubansaas.tech)
3. Crear registro DNS CNAME proxied apuntando al dominio del cliente
4. Aplicar reglas de seguridad a nivel de zona
5. Devolver URL protegida al cliente

DIFERENCIAS CON csaas-provision.py:
- NO usa Custom Hostnames (requiere plan Business+)
- NO usa custom_origin_server ni custom_origin_sni
- Usa CNAME directo con proxy activado
- Más simple y compatible con plan gratuito
"""
from http.server import BaseHTTPRequestHandler
import json
import os
import sys
import time
import urllib.request
import urllib.parse
import urllib.error
import hashlib
from typing import Optional, Dict, List, Tuple

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
    from config import is_service_enabled, CF_API_TOKEN, CF_ZONE_ID, CSAAS_ZONE, API_TIMEOUT
    from config import CSaaSConfig as SharedCSaaSConfig
    CONFIG_AVAILABLE = True
except ImportError:
    CONFIG_AVAILABLE = False
    CF_API_TOKEN = os.getenv("CF_API_TOKEN", "")
    CF_ZONE_ID = os.getenv("CF_ZONE_ID", "")
    CSAAS_ZONE = os.getenv("CSAAS_ZONE", "cubansaas.tech")
    API_TIMEOUT = 30
    def is_service_enabled():
        return True
    class SharedCSaaSConfig:
        PROVISIONED_CLIENTS = {}

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
    from utils import validate_url
    UTILS_AVAILABLE = True
except ImportError:
    UTILS_AVAILABLE = False
    def validate_url(url: str):
        if not url or not isinstance(url, str):
            return False, None, "URL inválida"
        if "://" in url or "/" in url or " " in url:
            return False, None, f"URL debe ser un dominio FQDN sin esquemas ni rutas: {url}"
        return True, url.strip().lower(), None

try:
    from exceptions import ValidationError, ServiceDisabledError
    EXCEPTIONS_AVAILABLE = True
except ImportError:
    EXCEPTIONS_AVAILABLE = False
    class BaseAPIError(Exception):
        status_code = 500
        def to_dict(self):
            return {"error": str(self)}
    ValidationError = BaseAPIError
    ServiceDisabledError = BaseAPIError


# ===============================
# Configuración CSaaS Simple
# ===============================
class SimpleCSaaSConfig:
    """Configuración para CSaaS simplificado"""
    CF_API_TOKEN = CF_API_TOKEN
    CF_ZONE_ID = CF_ZONE_ID
    CF_API_BASE_URL = "https://api.cloudflare.com/client/v4"
    SAAS_ZONE = CSAAS_ZONE
    PROVISIONED_CLIENTS = {}


# ===============================
# Utilidades
# ===============================
def generate_subdomain(client_name: str, client_id: Optional[str] = None) -> str:
    """Genera un subdominio único"""
    clean_name = ''.join(c.lower() for c in client_name if c.isalnum())[:20]
    
    if client_id:
        unique_str = f"{client_name}-{client_id}-{int(time.time())}"
    else:
        unique_str = f"{client_name}-{int(time.time())}"
    
    hash_suffix = hashlib.md5(unique_str.encode()).hexdigest()[:8]
    subdomain = f"{clean_name}-{hash_suffix}.{SimpleCSaaSConfig.SAAS_ZONE}"
    
    return subdomain


def validate_client_data(data: Dict) -> Tuple[bool, Optional[str]]:
    """Valida los datos del cliente"""
    client_name = data.get("client_name", "").strip()
    if not client_name:
        return False, "El nombre del cliente es requerido"
    
    urls = data.get("urls", [])
    if not urls or not isinstance(urls, list):
        return False, "Debe proporcionar al menos una URL a proteger"
    
    for url in urls:
        is_valid, _, error = validate_url(url)
        if not is_valid:
            return False, error or f"URL inválida: {url}"
    
    return True, None


# ===============================
# Cliente Cloudflare Simple
# ===============================
class CloudflareSimpleClient:
    """Cliente simplificado para Cloudflare API"""
    
    def __init__(self, api_token: str, zone_id: str):
        self.api_token = api_token
        self.zone_id = zone_id
        self.logs = []
        self.timeout = API_TIMEOUT
    
    def log(self, message: str, level: str = "INFO"):
        """Registra un mensaje"""
        self.logs.append(f"[{level}] {message}")
        if LOGGING_AVAILABLE:
            if level == "ERROR":
                protection_logger.error(message)
            else:
                protection_logger.info(message)
    
    def request(self, method: str, endpoint: str, data: Optional[Dict] = None) -> Optional[Dict]:
        """Realiza petición HTTP a Cloudflare API"""
        try:
            url = f"{SimpleCSaaSConfig.CF_API_BASE_URL}/{endpoint}"
            headers = {
                "Authorization": f"Bearer {self.api_token}",
                "Content-Type": "application/json"
            }
            
            req = urllib.request.Request(
                url,
                data=json.dumps(data).encode('utf-8') if data else None,
                headers=headers,
                method=method
            )
            
            with urllib.request.urlopen(req, timeout=self.timeout) as response:
                return json.loads(response.read().decode('utf-8'))
        
        except urllib.error.HTTPError as err:
            error_body = None
            try:
                error_body = json.loads(err.read().decode('utf-8'))
            except:
                pass
            
            self.log(f"Error HTTP {err.code}: {err.reason}", "ERROR")
            if error_body:
                self.log(f"Detalle: {json.dumps(error_body)}", "ERROR")
                if LOGGING_AVAILABLE:
                    log_api_error(endpoint, f"HTTP {err.code}", "HTTPError", error_body=error_body)
            
            return None
        
        except Exception as e:
            self.log(f"Error en request: {str(e)}", "ERROR")
            if LOGGING_AVAILABLE:
                log_api_error(endpoint, str(e), type(e).__name__)
            return None
    
    def create_cname_proxied(self, subdomain: str, target: str) -> Tuple[bool, Optional[str]]:
        """
        Crea un registro CNAME proxied
        
        Args:
            subdomain: Subdominio completo (ej: cliente123.cubansaas.tech)
            target: Dominio del cliente (ej: www.cliente.com)
        
        Returns:
            (éxito, record_id)
        """
        self.log(f"[PASO 1/3] Creando registro CNAME proxied: {subdomain} -> {target}")
        
        # Verificar si ya existe
        search_res = self.request("GET", f"zones/{self.zone_id}/dns_records?name={subdomain}&type=CNAME")
        
        if search_res and search_res.get("result"):
            existing = search_res["result"]
            if existing:
                record_id = existing[0]["id"]
                self.log(f"✓ Registro CNAME ya existe (ID: {record_id})")
                return True, record_id
        
        # Crear nuevo registro
        payload = {
            "type": "CNAME",
            "name": subdomain,
            "content": target,
            "proxied": True,
            "ttl": 1,
            "comment": f"CSaaS Simple - Proxy a {target}"
        }
        
        res = self.request("POST", f"zones/{self.zone_id}/dns_records", payload)
        
        if res and res.get("success"):
            record_id = res["result"]["id"]
            self.log(f"✓ Registro CNAME creado exitosamente (ID: {record_id})")
            return True, record_id
        
        self.log("✗ Error al crear registro CNAME", "ERROR")
        return False, None
    
    def apply_security_rules(self) -> Dict[str, bool]:
        """Aplica reglas de seguridad básicas"""
        self.log(f"[PASO 2/3] Aplicando reglas de seguridad...")
        
        results = {}
        
        # WAF
        self.log("  → Configurando WAF...")
        waf_res = self.request("PATCH", f"zones/{self.zone_id}/settings/waf", {"value": "on"})
        results["waf"] = bool(waf_res and waf_res.get("success"))
        
        # HTTPS Redirect
        self.log("  → Configurando HTTPS Redirect...")
        https_res = self.request("PATCH", f"zones/{self.zone_id}/settings/always_use_https", {"value": "on"})
        results["https_redirect"] = bool(https_res and https_res.get("success"))
        
        # Security Level
        self.log("  → Configurando Security Level...")
        sec_res = self.request("PATCH", f"zones/{self.zone_id}/settings/security_level", {"value": "high"})
        results["security_level"] = bool(sec_res and sec_res.get("success"))
        
        # Bot Fight Mode
        self.log("  → Configurando Bot Fight Mode...")
        bot_res = self.request("PATCH", f"zones/{self.zone_id}/settings/bot_fight_mode", {"value": "on"})
        results["bot_fight_mode"] = bool(bot_res and bot_res.get("success"))
        
        # Browser Integrity Check
        self.log("  → Configurando Browser Integrity Check...")
        bic_res = self.request("PATCH", f"zones/{self.zone_id}/settings/browser_check", {"value": "on"})
        results["browser_check"] = bool(bic_res and bic_res.get("success"))
        
        success_count = sum(results.values())
        self.log(f"✓ Reglas de seguridad aplicadas: {success_count}/{len(results)}")
        
        return results
    
    def provision_client_simple(self, client_name: str, client_id: Optional[str], urls: List[str]) -> Dict:
        """
        CONTROLADOR CENTRAL: Provisiona un cliente con arquitectura simplificada
        
        Args:
            client_name: Nombre del cliente
            client_id: ID opcional del cliente
            urls: URLs a proteger
        
        Returns:
            Resultado del provisionamiento
        """
        self.log("=" * 60)
        self.log("=== INICIO PROVISIONAMIENTO CSaaS SIMPLE ===")
        self.log("=" * 60)
        
        # PASO 0: Generar subdominio único
        subdomain = generate_subdomain(client_name, client_id)
        self.log(f"[PASO 0/3] Subdominio generado: {subdomain}")
        
        # PASO 1: Crear registro CNAME proxied
        cname_success, record_id = self.create_cname_proxied(subdomain, urls[0])
        if not cname_success:
            return {
                "success": False,
                "error": "No se pudo crear el registro CNAME",
                "step_failed": "cname_creation",
                "logs": self.logs
            }
        
        # PASO 2: Aplicar reglas de seguridad
        security_results = self.apply_security_rules()
        
        # PASO 3: Almacenar en memoria
        self.log(f"[PASO 3/3] Almacenando información del cliente...")
        client_key = client_id or hashlib.md5(client_name.encode()).hexdigest()[:16]
        
        client_record = {
            "client_name": client_name,
            "client_id": client_id,
            "subdomain": subdomain,
            "cname_record_id": record_id,
            "origin_urls": urls,
            "status": "active",
            "security_rules": security_results,
            "created_at": time.time(),
            "architecture": "simple_cname_proxy"
        }
        
        SimpleCSaaSConfig.PROVISIONED_CLIENTS[client_key] = client_record
        SharedCSaaSConfig.PROVISIONED_CLIENTS[client_key] = client_record
        
        self.log("=" * 60)
        self.log("=== PROVISIONAMIENTO COMPLETADO ===")
        self.log(f"    URL Protegida: https://{subdomain}")
        self.log(f"    Arquitectura: CNAME Directo con Proxy")
        self.log("=" * 60)
        
        return {
            "success": True,
            "client_key": client_key,
            "subdomain": subdomain,
            "protected_url": f"https://{subdomain}",
            "cname_record_id": record_id,
            "status": "active",
            "origin_urls": urls,
            "security_rules": security_results,
            "architecture": "simple_cname_proxy",
            "logs": self.logs
        }


# ===============================
# Handler de Vercel
# ===============================
class handler(BaseHTTPRequestHandler):
    """Handler para Vercel Serverless Function"""
    
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
    
    def _send_error(self, message: str, status_code: int, **extra):
        payload = {"status": "error", "message": message}
        payload.update(extra)
        self._send_json(payload, status_code)
    
    def _read_json(self):
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length)
        try:
            return json.loads(body.decode('utf-8')), None
        except json.JSONDecodeError as e:
            return None, str(e)
    
    def do_OPTIONS(self):
        """Maneja preflight CORS"""
        host = self.headers.get('Host', '')
        if not is_host_allowed(host):
            self._send_error("Host no autorizado", 400, host=host)
            return
        self._send_json({"message": "OK"}, 200)
    
    def do_GET(self):
        """Health check y listado de clientes"""
        host = self.headers.get('Host', '')
        if not is_host_allowed(host):
            self._send_error("Host no autorizado", 400, host=host)
            return
        
        clients = []
        for key, info in SimpleCSaaSConfig.PROVISIONED_CLIENTS.items():
            clients.append({
                "client_key": key,
                "client_name": info["client_name"],
                "subdomain": info["subdomain"],
                "protected_url": f"https://{info['subdomain']}",
                "status": info["status"],
                "origin_urls": info["origin_urls"],
                "created_at": info["created_at"]
            })
        
        self._send_json({
            "status": "ok",
            "message": "CSaaS Simple Provisioning API funcionando",
            "saas_zone": SimpleCSaaSConfig.SAAS_ZONE,
            "provisioned_clients": clients,
            "total_clients": len(clients),
            "architecture": {
                "type": "CNAME Directo con Proxy (Plan Gratuito)",
                "description": "Arquitectura simplificada sin Custom Hostnames",
                "flow": "Cliente → Subdominio CNAME Proxied → Dominio Real"
            }
        }, 200)
    
    def do_POST(self):
        """Provisiona un nuevo cliente"""
        try:
            host = self.headers.get('Host', '')
            if not is_host_allowed(host):
                self._send_error("Host no autorizado", 400, host=host)
                return
            
            if not is_service_enabled():
                self._send_error("El servicio está deshabilitado temporalmente", 503, service_disabled=True)
                return
            
            data, parse_error = self._read_json()
            if parse_error:
                self._send_error(f"Error parseando JSON: {parse_error}", 400)
                return
            
            valid, error_msg = validate_client_data(data)
            if not valid:
                self._send_error(error_msg, 400)
                return
            
            client_name = data.get("client_name", "").strip()
            client_id = data.get("client_id", "").strip() or None
            urls = data.get("urls", [])
            
            if not SimpleCSaaSConfig.CF_API_TOKEN or not SimpleCSaaSConfig.CF_ZONE_ID:
                self._send_error(
                    "Cloudflare no está configurado. Configure CF_API_TOKEN y CF_ZONE_ID",
                    500,
                    simulation_mode=True,
                )
                return
            
            client = CloudflareSimpleClient(SimpleCSaaSConfig.CF_API_TOKEN, SimpleCSaaSConfig.CF_ZONE_ID)
            result = client.provision_client_simple(client_name, client_id, urls)
            
            if result.get("success"):
                self._send_json({
                    "status": "ok",
                    "message": "Cliente provisionado exitosamente con arquitectura simplificada",
                    "client_key": result["client_key"],
                    "subdomain": result["subdomain"],
                    "protected_url": result["protected_url"],
                    "cname_record_id": result["cname_record_id"],
                    "origin_urls": result["origin_urls"],
                    "security_rules": result["security_rules"],
                    "architecture": result["architecture"],
                    "logs": result["logs"]
                }, 200)
            else:
                error_message = result.get("error", "Error desconocido")
                step_failed = result.get("step_failed", "unknown")
                logs = result.get("logs", [])
                
                self._send_json({
                    "status": "error",
                    "message": error_message,
                    "step_failed": step_failed,
                    "logs": logs
                }, 500)
        
        except Exception as e:
            import traceback
            error_traceback = traceback.format_exc()
            
            if LOGGING_AVAILABLE:
                log_api_error("csaas_simple_provision", str(e), type(e).__name__)
                protection_logger.error(f"Traceback completo:\n{error_traceback}")
            
            print(f"ERROR en csaas-simple-provision: {str(e)}", file=sys.stderr)
            print(f"Traceback:\n{error_traceback}", file=sys.stderr)
            
            self._send_json({
                "status": "error",
                "message": f"Error interno del servidor: {str(e)}",
                "error_type": type(e).__name__,
                "traceback": error_traceback if os.getenv("DEBUG") == "true" else None
            }, 500)
