"""
Vercel Serverless Function - Domain Status
Consulta el estado actual de un dominio en Cloudflare
Demuestra evidencia técnica de configuración y estado
"""
from http.server import BaseHTTPRequestHandler
import json
import os
import urllib.request
import sys

# Agregar el directorio api al path
sys.path.insert(0, os.path.dirname(__file__))

try:
    from logger import get_logger, log_api_error
    LOGGING_AVAILABLE = True
    status_logger = get_logger("domain_status")
except ImportError:
    LOGGING_AVAILABLE = False
    status_logger = None
    log_api_error = lambda *args, **kwargs: None

# Configuración desde Vercel ENV
CF_API_TOKEN = os.getenv("CF_API_TOKEN", "")
CF_ZONE_ID = os.getenv("CF_ZONE_ID", "")
CF_API_BASE_URL = "https://api.cloudflare.com/client/v4"


def get_zone_status(zone_id: str, api_token: str) -> dict:
    """
    Obtiene el estado completo de la zona en Cloudflare
    Demuestra evidencia técnica de configuración actual
    """
    try:
        url = f"{CF_API_BASE_URL}/zones/{zone_id}"
        headers = {
            "Authorization": f"Bearer {api_token}",
            "Content-Type": "application/json"
        }
        
        req = urllib.request.Request(url, headers=headers, method='GET')
        
        with urllib.request.urlopen(req, timeout=10) as response:
            result = json.loads(response.read().decode('utf-8'))
        
        if result.get("success"):
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
        
        return {"success": False, "error": "No se pudo obtener información de la zona"}
    
    except Exception as e:
        log_api_error("get_zone_status", str(e), type(e).__name__, zone_id=zone_id)
        return {"success": False, "error": str(e)}


def get_domain_dns_records(domain: str, zone_id: str, api_token: str) -> dict:
    """
    Obtiene los registros DNS de un dominio específico
    Demuestra idempotencia: detecta recursos existentes
    """
    try:
        url = f"{CF_API_BASE_URL}/zones/{zone_id}/dns_records?name={domain}"
        headers = {
            "Authorization": f"Bearer {api_token}",
            "Content-Type": "application/json"
        }
        
        req = urllib.request.Request(url, headers=headers, method='GET')
        
        with urllib.request.urlopen(req, timeout=10) as response:
            result = json.loads(response.read().decode('utf-8'))
        
        if result.get("success"):
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
        
        return {"success": False, "error": "No se pudieron obtener registros DNS"}
    
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
            url = f"{CF_API_BASE_URL}/zones/{zone_id}/settings/{setting}"
            headers = {
                "Authorization": f"Bearer {api_token}",
                "Content-Type": "application/json"
            }
            
            req = urllib.request.Request(url, headers=headers, method='GET')
            
            try:
                with urllib.request.urlopen(req, timeout=10) as response:
                    result = json.loads(response.read().decode('utf-8'))
                
                if result.get("success"):
                    settings_data[setting] = {
                        "value": result["result"].get("value"),
                        "modified_on": result["result"].get("modified_on"),
                        "editable": result["result"].get("editable", True)
                    }
                else:
                    settings_data[setting] = {"error": "No disponible"}
            
            except Exception as e:
                settings_data[setting] = {"error": str(e)}
        
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
        url = f"{CF_API_BASE_URL}/zones/{zone_id}/firewall/rules"
        headers = {
            "Authorization": f"Bearer {api_token}",
            "Content-Type": "application/json"
        }
        
        req = urllib.request.Request(url, headers=headers, method='GET')
        
        with urllib.request.urlopen(req, timeout=10) as response:
            result = json.loads(response.read().decode('utf-8'))
        
        if result.get("success"):
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
        
        return {"success": False, "error": "No se pudieron obtener reglas de firewall"}
    
    except urllib.error.HTTPError as e:
        # Tolerancia a fallos: plan no soporta firewall rules
        if e.code == 403:
            return {
                "success": True,
                "available": False,
                "reason": "Firewall Rules no disponible en tu plan actual",
                "total_rules": 0,
                "cas_rules": 0,
                "rules": []
            }
        log_api_error("get_firewall_rules", str(e), "HTTPError", zone_id=zone_id, status_code=e.code)
        return {"success": False, "error": str(e)}
    
    except Exception as e:
        log_api_error("get_firewall_rules", str(e), type(e).__name__, zone_id=zone_id)
        return {"success": False, "error": str(e)}


class handler(BaseHTTPRequestHandler):
    """Handler para Vercel Serverless Function"""
    
    def _set_headers(self, status_code=200, content_type='application/json'):
        """Configura los headers de respuesta"""
        self.send_response(status_code)
        self.send_header('Content-Type', content_type)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
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
                self._send_json({
                    "status": "error",
                    "message": f"Error parseando JSON: {str(e)}"
                }, 400)
                return
            
            # Obtener dominio
            domain = data.get("domain", "").strip()
            
            if not domain:
                self._send_json({
                    "status": "error",
                    "message": "Falta el parámetro 'domain'"
                }, 400)
                return
            
            # Verificar configuración de Cloudflare
            if not CF_API_TOKEN or not CF_ZONE_ID:
                self._send_json({
                    "status": "error",
                    "message": "Cloudflare no está configurado (CF_API_TOKEN y CF_ZONE_ID requeridos)"
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
            
        except Exception as e:
            log_api_error("status_endpoint", str(e), type(e).__name__)
            self._send_json({
                "status": "error",
                "message": f"Error interno del servidor: {str(e)}",
                "type": type(e).__name__
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
