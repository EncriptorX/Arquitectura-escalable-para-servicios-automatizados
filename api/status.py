"""
Vercel Serverless Function - Domain Status
Consulta el estado actual de un dominio en Cloudflare
Demuestra evidencia técnica de configuración y estado
"""
from http.server import BaseHTTPRequestHandler
import json
import os
import sys
import urllib.request
import urllib.error

# Agregar el directorio api al path
sys.path.insert(0, os.path.dirname(__file__))

try:
    from utils import get_cors_headers
except ImportError:
    def get_cors_headers(origin):
        allowed_origin = "null"
        return {
            "Access-Control-Allow-Origin": allowed_origin,
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
            "Vary": "Origin",
        }

try:
    from logger import get_logger, log_api_error
    LOGGING_AVAILABLE = True
    status_logger = get_logger("domain_status")
except ImportError:
    LOGGING_AVAILABLE = False
    status_logger = None
    log_api_error = lambda *args, **kwargs: None

try:
    from exceptions import (
        BaseAPIError,
        ValidationError,
        CloudflareAPIError,
        NetworkError,
        handle_cloudflare_error,
        get_user_friendly_message
    )
    EXCEPTIONS_AVAILABLE = True
except ImportError:
    EXCEPTIONS_AVAILABLE = False
    class BaseAPIError(Exception):
        status_code = 500
        error_category = "unknown"
        def to_dict(self):
            return {"error_type": "BaseAPIError", "message": str(self)}
    ValidationError = BaseAPIError
    CloudflareAPIError = BaseAPIError
    NetworkError = BaseAPIError
    handle_cloudflare_error = lambda *args, **kwargs: CloudflareAPIError("Error de Cloudflare")
    get_user_friendly_message = lambda e: str(e)

try:
    from config import CF_API_TOKEN, CF_ZONE_ID
    from utils import make_cloudflare_request
    CONFIG_AVAILABLE = True
except ImportError:
    CONFIG_AVAILABLE = False
    CF_API_TOKEN = os.getenv("CF_API_TOKEN", "")
    CF_ZONE_ID = os.getenv("CF_ZONE_ID", "")

    def make_cloudflare_request(method: str, endpoint: str, data=None):
        url = f"https://api.cloudflare.com/client/v4/{endpoint}"
        headers = {
            "Authorization": f"Bearer {CF_API_TOKEN}",
            "Content-Type": "application/json",
        }

        try:
            req = urllib.request.Request(url, headers=headers, method=method)
            with urllib.request.urlopen(req, timeout=10) as response:
                return json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            return {
                "success": False,
                "errors": [{"message": f"HTTP {e.code}: {e.reason}"}],
                "status_code": e.code,
            }
        except Exception as e:
            return {
                "success": False,
                "errors": [{"message": str(e)}],
                "status_code": None,
            }


def _extract_error_message(result: dict, fallback: str) -> str:
    if not isinstance(result, dict):
        return fallback
    errors = result.get("errors") or []
    if errors and isinstance(errors, list) and isinstance(errors[0], dict):
        return errors[0].get("message", fallback)
    return result.get("error") or fallback


def get_zone_status(zone_id: str, api_token: str) -> dict:
    """
    Obtiene el estado completo de la zona en Cloudflare
    Demuestra evidencia técnica de configuración actual
    """
    try:
        result = make_cloudflare_request("GET", f"zones/{zone_id}")

        if result and result.get("success"):
            zone_data = result["result"]
            return {
                "success": True,
                "zone": {
                    "id": zone_data.get("id"),
                    "name": zone_data.get("name"),
                    "status": zone_data.get("status"),
                    "paused": zone_data.get("paused", False),
                    "type": zone_data.get("type"),
                    "name_servers": zone_data.get("name_servers", []),
                    "original_name_servers": zone_data.get("original_name_servers", []),
                    "created_on": zone_data.get("created_on"),
                    "modified_on": zone_data.get("modified_on")
                }
            }
        
        return {
            "success": False,
            "error": _extract_error_message(result, "No se pudo obtener información de la zona"),
        }
    
    except Exception as e:
        log_api_error("get_zone_status", str(e), type(e).__name__, zone_id=zone_id)
        return {"success": False, "error": str(e)}


def get_domain_dns_records(domain: str, zone_id: str, api_token: str) -> dict:
    """
    Obtiene los registros DNS de un dominio específico
    Demuestra idempotencia: detecta recursos existentes
    """
    try:
        result = make_cloudflare_request("GET", f"zones/{zone_id}/dns_records?name={domain}")

        if result and result.get("success"):
            records = result.get("result", [])
            return {
                "success": True,
                "exists": len(records) > 0,
                "count": len(records),
                "records": [
                    {
                        "id": r.get("id"),
                        "type": r.get("type"),
                        "name": r.get("name"),
                        "content": r.get("content"),
                        "proxied": r.get("proxied", False),
                        "ttl": r.get("ttl"),
                        "created_on": r.get("created_on"),
                        "modified_on": r.get("modified_on")
                    }
                    for r in records
                ]
            }
        
        return {
            "success": False,
            "error": _extract_error_message(result, "No se pudieron obtener registros DNS"),
        }
    
    except Exception as e:
        log_api_error("get_domain_dns_records", str(e), type(e).__name__, domain=domain, zone_id=zone_id)
        return {"success": False, "error": str(e)}


def get_zone_settings(zone_id: str, api_token: str) -> dict:
    """
    Obtiene las configuraciones de seguridad de la zona
    Demuestra estado actual de protecciones
    """
    try:
        settings_to_check = ["waf", "ssl", "always_use_https", "security_level"]
        settings_data = {}
        
        for setting in settings_to_check:
            result = make_cloudflare_request("GET", f"zones/{zone_id}/settings/{setting}")

            if result and result.get("success"):
                settings_data[setting] = {
                    "value": result["result"].get("value"),
                    "modified_on": result["result"].get("modified_on"),
                    "editable": result["result"].get("editable", True),
                }
            else:
                settings_data[setting] = {"error": _extract_error_message(result, "No disponible")}
        
        return {
            "success": True,
            "settings": settings_data
        }
    
    except Exception as e:
        log_api_error("get_zone_settings", str(e), type(e).__name__, zone_id=zone_id)
        return {"success": False, "error": str(e)}


def get_firewall_rules(zone_id: str, api_token: str) -> dict:
    """
    Obtiene las reglas de firewall de la zona
    Demuestra idempotencia: detecta reglas existentes
    """
    try:
        result = make_cloudflare_request("GET", f"zones/{zone_id}/firewall/rules")

        if result and result.get("success"):
            rules = result.get("result", [])
            cas_rules = [r for r in rules if "CAS" in r.get("description", "")]
            
            return {
                "success": True,
                "total_rules": len(rules),
                "cas_rules": len(cas_rules),
                "rules": [
                    {
                        "id": r.get("id"),
                        "description": r.get("description"),
                        "action": r.get("action"),
                        "paused": r.get("paused", False),
                        "filter": r.get("filter", {}).get("expression", ""),
                        "created_on": r.get("created_on"),
                        "modified_on": r.get("modified_on")
                    }
                    for r in cas_rules
                ]
            }
        
        # Tolerancia a fallos: plan no soporta firewall rules
        if result and result.get("status_code") == 403:
            return {
                "success": True,
                "available": False,
                "reason": "Firewall Rules no disponible en tu plan actual",
                "total_rules": 0,
                "cas_rules": 0,
                "rules": []
            }
        return {
            "success": False,
            "error": _extract_error_message(result, "No se pudieron obtener reglas de firewall"),
        }
    
    except Exception as e:
        log_api_error("get_firewall_rules", str(e), type(e).__name__, zone_id=zone_id)
        return {"success": False, "error": str(e)}


class handler(BaseHTTPRequestHandler):
    """Handler para Vercel Serverless Function"""
    
    def _set_headers(self, status_code=200, content_type='application/json'):
        """Configura los headers de respuesta"""
        self.send_response(status_code)
        self.send_header('Content-Type', content_type)
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
    
    def _send_json(self, data, status_code=200):
        """Envía una respuesta JSON"""
        self._set_headers(status_code)
        self.wfile.write(json.dumps(data, ensure_ascii=False).encode('utf-8'))
    
    def do_OPTIONS(self):
        """Maneja preflight CORS"""
        self._send_json({"message": "OK"}, 200)
    
    def do_GET(self):
        """Health check"""
        self._send_json({
            "status": "ok",
            "message": "API de estado de dominio funcionando",
            "has_cloudflare_config": bool(CF_API_TOKEN and CF_ZONE_ID)
        }, 200)
    
    def do_POST(self):
        """Obtiene el estado completo de un dominio"""
        try:
            # Leer el body
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length)
            
            # Parsear JSON
            try:
                data = json.loads(body.decode('utf-8'))
            except json.JSONDecodeError as e:
                if EXCEPTIONS_AVAILABLE:
                    error = ValidationError(f"Error parseando JSON: {str(e)}", field="body")
                    self._send_json({
                        "status": "error",
                        "message": error.message,
                        "error_type": error.__class__.__name__,
                        "error_category": error.error_category
                    }, error.status_code)
                else:
                    self._send_json({
                        "status": "error",
                        "message": f"Error parseando JSON: {str(e)}"
                    }, 400)
                return
            
            # Obtener dominio
            domain = data.get("domain", "").strip()
            
            if not domain:
                if EXCEPTIONS_AVAILABLE:
                    error = ValidationError("Falta el parámetro 'domain'", field="domain")
                    self._send_json({
                        "status": "error",
                        "message": error.message,
                        "error_type": error.__class__.__name__,
                        "error_category": error.error_category
                    }, error.status_code)
                else:
                    self._send_json({
                        "status": "error",
                        "message": "Falta el parámetro 'domain'"
                    }, 400)
                return
            
            # Verificar configuración de Cloudflare
            if not CF_API_TOKEN or not CF_ZONE_ID:
                self._send_json({
                    "status": "error",
                    "message": "Cloudflare no está configurado (CF_API_TOKEN y CF_ZONE_ID requeridos)",
                    "error_type": "ConfigurationError",
                    "error_category": "configuration_error"
                }, 500)
                return
            
            # Log de consulta
            if LOGGING_AVAILABLE and status_logger:
                status_logger.info(
                    "Consultando estado de dominio",
                    domain=domain,
                    zone_id=CF_ZONE_ID
                )
            
            # Obtener estado de la zona
            zone_status = get_zone_status(CF_ZONE_ID, CF_API_TOKEN)
            
            # Obtener registros DNS del dominio
            dns_records = get_domain_dns_records(domain, CF_ZONE_ID, CF_API_TOKEN)
            
            # Obtener configuraciones de seguridad
            security_settings = get_zone_settings(CF_ZONE_ID, CF_API_TOKEN)
            
            # Obtener reglas de firewall
            firewall_rules = get_firewall_rules(CF_ZONE_ID, CF_API_TOKEN)
            
            # Construir respuesta
            response = {
                "status": "ok",
                "domain": domain,
                "timestamp": self._get_timestamp(),
                "zone": zone_status.get("zone") if zone_status.get("success") else {"error": zone_status.get("error")},
                "dns_records": dns_records,
                "security_settings": security_settings.get("settings") if security_settings.get("success") else {"error": security_settings.get("error")},
                "firewall_rules": firewall_rules,
                "evidence": {
                    "idempotent": dns_records.get("exists", False),
                    "protected": self._is_protected(security_settings, firewall_rules),
                    "proxied": self._is_proxied(dns_records)
                }
            }
            
            # Log de resultado
            if LOGGING_AVAILABLE and status_logger:
                status_logger.audit(
                    "domain_status_checked",
                    domain=domain,
                    exists=dns_records.get("exists", False),
                    protected=response["evidence"]["protected"],
                    proxied=response["evidence"]["proxied"]
                )
            
            self._send_json(response, 200)
        
        except BaseAPIError as e:
            # Capturar excepciones tipadas
            self._send_json({
                "status": "error",
                "message": get_user_friendly_message(e) if EXCEPTIONS_AVAILABLE else str(e),
                "error_type": e.__class__.__name__ if EXCEPTIONS_AVAILABLE else "Error",
                "error_category": e.error_category if EXCEPTIONS_AVAILABLE else "unknown",
                "technical_message": e.message if EXCEPTIONS_AVAILABLE else str(e)
            }, getattr(e, 'status_code', 500))
        
        except Exception as e:
            log_api_error("status_endpoint", str(e), type(e).__name__)
            self._send_json({
                "status": "error",
                "message": f"Error interno del servidor: {str(e)}",
                "error_type": type(e).__name__,
                "error_category": "internal_error"
            }, 500)
    
    def _is_protected(self, security_settings: dict, firewall_rules: dict) -> bool:
        """Determina si el dominio está protegido"""
        if not security_settings.get("success"):
            return False
        
        settings = security_settings.get("settings", {})
        
        waf_on = settings.get("waf", {}).get("value") == "on"
        https_on = settings.get("always_use_https", {}).get("value") == "on"
        has_rules = firewall_rules.get("cas_rules", 0) > 0
        
        return waf_on and https_on
    
    def _is_proxied(self, dns_records: dict) -> bool:
        """Determina si el dominio está proxied"""
        if not dns_records.get("success") or not dns_records.get("exists"):
            return False
        
        records = dns_records.get("records", [])
        return any(r.get("proxied", False) for r in records)
    
    def _get_timestamp(self):
        """Retorna timestamp actual en formato ISO"""
        from datetime import datetime
        return datetime.utcnow().isoformat() + "Z"
