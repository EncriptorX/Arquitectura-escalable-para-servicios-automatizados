"""
Vercel Serverless Function - Toggle Protection
Permite habilitar o deshabilitar las políticas de seguridad de Cloudflare
"""
from http.server import BaseHTTPRequestHandler
import json
import os
import urllib.request
import urllib.error
import sys
from typing import Optional, Dict

# Agregar el directorio api al path
sys.path.insert(0, os.path.dirname(__file__))

try:
    from config import CF_API_TOKEN, CF_ZONE_ID, API_TIMEOUT
    from utils import validate_url, make_cloudflare_request
    UTILS_AVAILABLE = True
except ImportError:
    UTILS_AVAILABLE = False
    CF_API_TOKEN = os.getenv("CF_API_TOKEN", "")
    CF_ZONE_ID = os.getenv("CF_ZONE_ID", "")
    API_TIMEOUT = 30
    # Fallback básico
    def validate_url(url):
        if not url or "://" in url or "/" in url:
            return False, None, "Formato de dominio inválido"
        return True, url.strip().lower(), None
    def make_cloudflare_request(method: str, endpoint: str, data: Optional[Dict] = None):
        return None


class CloudflareProtectionToggle:
    """Clase para habilitar/deshabilitar protecciones de Cloudflare"""
    
    def __init__(self, token, zone_id):
        self.base_url = "https://api.cloudflare.com/client/v4"
        self.zone_id = zone_id
        self.headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        self.logs = []
        self.timeout = API_TIMEOUT
    
    def _log(self, message, level="INFO"):
        """Helper para logging"""
        log_entry = f"[{level}] {message}"
        self.logs.append(log_entry)
        return log_entry
    
    def _request(self, method, endpoint, data=None):
        """Wrapper para realizar peticiones HTTP a la API de Cloudflare"""
        # Usar utilitario centralizado si está disponible (token desde env)
        if UTILS_AVAILABLE:
            result = make_cloudflare_request(method, endpoint, data)
            if not result or not result.get("success"):
                self._log("Error en request a Cloudflare", "ERROR")
            return result

        url = f"{self.base_url}/{endpoint}"
        try:
            data_encoded = json.dumps(data).encode('utf-8') if data else None
            headers_dict = self.headers.copy()

            req = urllib.request.Request(url, data=data_encoded, headers=headers_dict, method=method)

            with urllib.request.urlopen(req, timeout=self.timeout) as response:
                return json.loads(response.read().decode('utf-8'))
        except urllib.error.HTTPError as err:
            self._log(f"Error HTTP {err.code}: {err.reason}", "ERROR")
            try:
                error_body = json.loads(err.read().decode('utf-8'))
                self._log(f"Detalle: {json.dumps(error_body)}", "ERROR")
            except Exception:
                pass
            return None
        except Exception as e:
            self._log(f"Error en request: {str(e)}", "ERROR")
            return None

    def _toggle_setting(self, setting_key: str, enable: bool, value_on: str, value_off: str, label: str) -> bool:
        """Helper genérico para toggles de settings"""
        value = value_on if enable else value_off
        self._log(f"{'Activando' if enable else 'Desactivando'} {label}...")

        res = self._request("PATCH", f"zones/{self.zone_id}/settings/{setting_key}", {"value": value})

        if res and res.get("success"):
            self._log(f"✓ {label} {'activado' if enable else 'desactivado'}")
            return True

        self._log(f"Error al {'activar' if enable else 'desactivar'} {label}", "ERROR")
        return False

    def _get_setting_value(self, setting_key: str) -> Optional[str]:
        """Obtiene valor de un setting"""
        res = self._request("GET", f"zones/{self.zone_id}/settings/{setting_key}")
        if res and res.get("success"):
            return res["result"].get("value")
        return None
    
    def toggle_waf(self, enable):
        """Habilita o deshabilita el WAF"""
        return self._toggle_setting("waf", enable, "on", "off", "WAF")
    
    def toggle_https_redirect(self, enable):
        """Habilita o deshabilita la redirección HTTPS"""
        return self._toggle_setting("always_use_https", enable, "on", "off", "Always Use HTTPS")
    
    def toggle_security_level(self, enable):
        """Ajusta el nivel de seguridad"""
        value = "high" if enable else "medium"
        self._log(f"Ajustando nivel de seguridad a {value}...")
        return self._toggle_setting("security_level", enable, "high", "medium", "nivel de seguridad")
    
    def toggle_firewall_rules(self, enable):
        """Habilita o deshabilita las reglas de firewall CAS"""
        self._log(f"{'Activando' if enable else 'Desactivando'} reglas de firewall...")
        
        # Obtener todas las reglas de firewall
        search_res = self._request("GET", f"zones/{self.zone_id}/firewall/rules")
        
        if not search_res or not search_res.get("success"):
            self._log("No se pudieron obtener reglas de firewall", "ERROR")
            return False
        
        rules = search_res.get("result", [])
        cas_rules = [r for r in rules if "CAS" in r.get("description", "")]
        
        if not cas_rules:
            self._log("No se encontraron reglas CAS para modificar", "WARN")
            return True
        
        # Actualizar cada regla CAS
        success_count = 0
        for rule in cas_rules:
            rule_id = rule["id"]
            
            # Actualizar el estado paused
            update_payload = {
                "filter": rule["filter"],
                "action": rule["action"],
                "description": rule["description"],
                "paused": not enable  # Si enable=True, paused=False
            }
            
            res = self._request("PUT", f"zones/{self.zone_id}/firewall/rules/{rule_id}", update_payload)
            
            if res and res.get("success"):
                success_count += 1
                self._log(f"✓ Regla '{rule['description']}' {'activada' if enable else 'desactivada'}")
            else:
                self._log(f"Error al modificar regla '{rule['description']}'", "ERROR")
        
        return success_count > 0
    
    def toggle_dns_proxy(self, domain, enable):
        """Habilita o deshabilita el proxy DNS para un dominio específico"""
        self._log(f"{'Activando' if enable else 'Desactivando'} proxy DNS para {domain}...")
        
        # Buscar el registro DNS
        search_res = self._request("GET", f"zones/{self.zone_id}/dns_records?name={domain}")
        
        if not search_res or not search_res.get("result"):
            self._log(f"No se encontró registro DNS para {domain}", "ERROR")
            return False
        
        records = search_res["result"]
        if not records:
            self._log(f"No hay registros DNS para {domain}", "WARN")
            return False
        
        # Actualizar el primer registro encontrado
        record = records[0]
        record_id = record["id"]
        
        update_payload = {
            "type": record["type"],
            "name": record["name"],
            "content": record["content"],
            "proxied": enable,
            "ttl": 1 if enable else 3600
        }
        
        res = self._request("PUT", f"zones/{self.zone_id}/dns_records/{record_id}", update_payload)
        
        if res and res.get("success"):
            self._log(f"✓ Proxy DNS {'activado' if enable else 'desactivado'} para {domain}")
            return True
        else:
            self._log(f"Error al modificar proxy DNS para {domain}", "ERROR")
            return False
    
    def get_protection_status(self):
        """Obtiene el estado actual de todas las protecciones"""
        self._log("Obteniendo estado de protecciones...")
        
        status = {
            "waf": None,
            "https_redirect": None,
            "security_level": None,
            "firewall_rules": [],
            "overall_enabled": False
        }
        
        # WAF
        waf_value = self._get_setting_value("waf")
        if waf_value is not None:
            status["waf"] = waf_value == "on"
        
        # HTTPS Redirect
        https_value = self._get_setting_value("always_use_https")
        if https_value is not None:
            status["https_redirect"] = https_value == "on"
        
        # Security Level
        status["security_level"] = self._get_setting_value("security_level")
        
        # Firewall Rules
        fw_res = self._request("GET", f"zones/{self.zone_id}/firewall/rules")
        if fw_res and fw_res.get("success"):
            rules = fw_res.get("result", [])
            cas_rules = [r for r in rules if "CAS" in r.get("description", "")]
            status["firewall_rules"] = [
                {
                    "id": r["id"],
                    "description": r["description"],
                    "action": r["action"],
                    "enabled": not r.get("paused", False)
                }
                for r in cas_rules
            ]
        
        # Determinar estado general
        status["overall_enabled"] = (
            status["waf"] == True and
            status["https_redirect"] == True and
            status["security_level"] == "high" and
            all(r["enabled"] for r in status["firewall_rules"])
        )
        
        return status
    
    def toggle_all_protections(self, enable, domain=None):
        """Habilita o deshabilita todas las protecciones"""
        self._log(f"=== {'ACTIVANDO' if enable else 'DESACTIVANDO'} TODAS LAS PROTECCIONES ===")
        
        results = {
            "waf": self.toggle_waf(enable),
            "https_redirect": self.toggle_https_redirect(enable),
            "security_level": self.toggle_security_level(enable),
            "firewall_rules": self.toggle_firewall_rules(enable)
        }
        
        # Si se especifica un dominio, también toggle el proxy DNS
        if domain:
            results["dns_proxy"] = self.toggle_dns_proxy(domain, enable)
        
        success = all(results.values())
        
        if success:
            self._log(f"=== PROTECCIONES {'ACTIVADAS' if enable else 'DESACTIVADAS'} EXITOSAMENTE ===")
        else:
            self._log(f"=== ALGUNAS PROTECCIONES NO SE PUDIERON {'ACTIVAR' if enable else 'DESACTIVAR'} ===", "WARN")
        
        return {
            "success": success,
            "results": results,
            "logs": self.logs
        }


class handler(BaseHTTPRequestHandler):
    """Handler para Vercel Serverless Function"""
    
    def _set_headers(self, status_code=200, content_type='application/json'):
        """Configura los headers de respuesta"""
        self.send_response(status_code)
        self.send_header('Content-Type', content_type)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.end_headers()
    
    def _send_json(self, data, status_code=200):
        """Envía una respuesta JSON"""
        self._set_headers(status_code)
        self.wfile.write(json.dumps(data, ensure_ascii=False).encode('utf-8'))

    def _send_error(self, message: str, status_code: int, error_type: str = None, error_category: str = None, **extra):
        payload = {"status": "error", "message": message}
        if error_type:
            payload["error_type"] = error_type
        if error_category:
            payload["error_category"] = error_category
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
        self._send_json({"message": "OK"}, 200)
    
    def do_GET(self):
        """Obtiene el estado actual de las protecciones"""
        try:
            # Verificar configuración de Cloudflare
            if not CF_API_TOKEN or not CF_ZONE_ID:
                self._send_json({
                    "status": "error",
                    "message": "Cloudflare no está configurado (CF_API_TOKEN y CF_ZONE_ID requeridos)"
                }, 500)
                return
            
            # Obtener estado
            toggler = CloudflareProtectionToggle(CF_API_TOKEN, CF_ZONE_ID)
            status = toggler.get_protection_status()
            
            self._send_json({
                "status": "ok",
                "protection_status": status,
                "logs": toggler.logs
            }, 200)
            
        except Exception as e:
            self._send_json({
                "status": "error",
                "message": f"Error interno del servidor: {str(e)}",
                "type": type(e).__name__
            }, 500)
    
    def do_POST(self):
        """Habilita o deshabilita las protecciones"""
        try:
            data, parse_error = self._read_json()
            if parse_error:
                self._send_error(f"Error parseando JSON: {parse_error}", 400)
                return
            
            # Verificar configuración de Cloudflare
            if not CF_API_TOKEN or not CF_ZONE_ID:
                self._send_error(
                    "Cloudflare no está configurado (CF_API_TOKEN y CF_ZONE_ID requeridos)",
                    500,
                )
                return
            
            # Obtener parámetros
            enable = data.get("enable", True)
            domain = data.get("domain")
            
            if enable is None:
                self._send_error("Falta el parámetro 'enable' (true/false)", 400)
                return
            
            # Validar dominio si se proporciona
            if domain:
                valid, validated_domain, error = validate_url(domain)
                if not valid:
                    self._send_error(
                        f"Dominio inválido: {error}",
                        400,
                        invalid_domain=domain,
                    )
                    return
                domain = validated_domain
            
            # Toggle protecciones
            toggler = CloudflareProtectionToggle(CF_API_TOKEN, CF_ZONE_ID)
            result = toggler.toggle_all_protections(enable, domain)
            
            # Obtener estado actualizado
            updated_status = toggler.get_protection_status()
            
            self._send_json({
                "status": "ok",
                "message": f"Protecciones {'activadas' if enable else 'desactivadas'} exitosamente",
                "toggle_result": result,
                "protection_status": updated_status
            }, 200)
            
        except Exception as e:
            self._send_error(
                f"Error interno del servidor: {str(e)}",
                500,
                error_type=type(e).__name__,
            )
