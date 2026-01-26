"""
Vercel Serverless Function - Toggle Protection
Permite habilitar o deshabilitar las políticas de seguridad de Cloudflare
"""
from http.server import BaseHTTPRequestHandler
import json
import os
import re
import urllib.request
import sys

# Agregar el directorio api al path
sys.path.insert(0, os.path.dirname(__file__))

try:
    from utils import validate_url
    UTILS_AVAILABLE = True
except ImportError:
    UTILS_AVAILABLE = False
    # Fallback básico
    def validate_url(url):
        if not url or "://" in url or "/" in url:
            return False, None, "Formato de dominio inválido"
        return True, url.strip().lower(), None

# Configuración desde Vercel ENV
CF_API_TOKEN = os.getenv("CF_API_TOKEN", "")
CF_ZONE_ID = os.getenv("CF_ZONE_ID", "")


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
    
    def _log(self, message, level="INFO"):
        """Helper para logging"""
        log_entry = f"[{level}] {message}"
        self.logs.append(log_entry)
        return log_entry
    
    def _request(self, method, endpoint, data=None):
        """Wrapper para realizar peticiones HTTP a la API de Cloudflare"""
        url = f"{self.base_url}/{endpoint}"
        try:
            data_encoded = json.dumps(data).encode('utf-8') if data else None
            headers_dict = self.headers.copy()
            
            req = urllib.request.Request(url, data=data_encoded, headers=headers_dict, method=method)
            
            with urllib.request.urlopen(req, timeout=30) as response:
                return json.loads(response.read().decode('utf-8'))
        except urllib.error.HTTPError as err:
            self._log(f"Error HTTP {err.code}: {err.reason}", "ERROR")
            try:
                error_body = json.loads(err.read().decode('utf-8'))
                self._log(f"Detalle: {json.dumps(error_body)}", "ERROR")
            except:
                pass
            return None
        except Exception as e:
            self._log(f"Error en request: {str(e)}", "ERROR")
            return None
    
    def toggle_waf(self, enable):
        """Habilita o deshabilita el WAF"""
        value = "on" if enable else "off"
        self._log(f"{'Activando' if enable else 'Desactivando'} WAF...")
        
        res = self._request("PATCH", f"zones/{self.zone_id}/settings/waf", {"value": value})
        
        if res and res.get("success"):
            self._log(f"✓ WAF {'activado' if enable else 'desactivado'}")
            return True
        else:
            self._log(f"Error al {'activar' if enable else 'desactivar'} WAF", "ERROR")
            return False
    
    def toggle_https_redirect(self, enable):
        """Habilita o deshabilita la redirección HTTPS"""
        value = "on" if enable else "off"
        self._log(f"{'Activando' if enable else 'Desactivando'} Always Use HTTPS...")
        
        res = self._request("PATCH", f"zones/{self.zone_id}/settings/always_use_https", {"value": value})
        
        if res and res.get("success"):
            self._log(f"✓ Redirección HTTPS {'activada' if enable else 'desactivada'}")
            return True
        else:
            self._log(f"Error al {'activar' if enable else 'desactivar'} redirección HTTPS", "ERROR")
            return False
    
    def toggle_security_level(self, enable):
        """Ajusta el nivel de seguridad"""
        value = "high" if enable else "medium"
        self._log(f"Ajustando nivel de seguridad a {value}...")
        
        res = self._request("PATCH", f"zones/{self.zone_id}/settings/security_level", {"value": value})
        
        if res and res.get("success"):
            self._log(f"✓ Nivel de seguridad ajustado a {value}")
            return True
        else:
            self._log(f"Error al ajustar nivel de seguridad", "ERROR")
            return False
    
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
        waf_res = self._request("GET", f"zones/{self.zone_id}/settings/waf")
        if waf_res and waf_res.get("success"):
            status["waf"] = waf_res["result"]["value"] == "on"
        
        # HTTPS Redirect
        https_res = self._request("GET", f"zones/{self.zone_id}/settings/always_use_https")
        if https_res and https_res.get("success"):
            status["https_redirect"] = https_res["result"]["value"] == "on"
        
        # Security Level
        sec_res = self._request("GET", f"zones/{self.zone_id}/settings/security_level")
        if sec_res and sec_res.get("success"):
            status["security_level"] = sec_res["result"]["value"]
        
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
            
            # Verificar configuración de Cloudflare
            if not CF_API_TOKEN or not CF_ZONE_ID:
                self._send_json({
                    "status": "error",
                    "message": "Cloudflare no está configurado (CF_API_TOKEN y CF_ZONE_ID requeridos)"
                }, 500)
                return
            
            # Obtener parámetros
            enable = data.get("enable", True)
            domain = data.get("domain")
            
            if enable is None:
                self._send_json({
                    "status": "error",
                    "message": "Falta el parámetro 'enable' (true/false)"
                }, 400)
                return
            
            # Validar dominio si se proporciona
            if domain:
                valid, validated_domain, error = validate_url(domain)
                if not valid:
                    self._send_json({
                        "status": "error",
                        "message": f"Dominio inválido: {error}",
                        "invalid_domain": domain
                    }, 400)
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
            self._send_json({
                "status": "error",
                "message": f"Error interno del servidor: {str(e)}",
                "type": type(e).__name__
            }, 500)
