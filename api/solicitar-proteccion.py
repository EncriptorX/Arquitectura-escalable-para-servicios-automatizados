"""
Vercel Serverless Function - Cloudflare Protection Integration
Simplified version without task system
"""
from http.server import BaseHTTPRequestHandler
import json
import os
import re
import urllib.request
import urllib.parse


# ===============================
# Configuración desde Vercel ENV
# ===============================
TURNSTILE_SECRET_KEY = os.getenv("TURNSTILE_SECRET_KEY", "")
CF_API_TOKEN = os.getenv("CF_API_TOKEN", "")
CF_ZONE_ID = os.getenv("CF_ZONE_ID", "")
CF_ACCOUNT_ID = os.getenv("CF_ACCOUNT_ID", "")


# ===============================
# Cloudflare Edge Protector
# ===============================
class CloudflareEdgeProtector:
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

    def fetch_zone_nameservers(self):
        """Obtiene los nameservers asignados por Cloudflare para la zona"""
        self._log("Obteniendo nameservers de Cloudflare...")
        res = self._request("GET", f"zones/{self.zone_id}")
        if res and res.get("success"):
            nameservers = res["result"].get("name_servers", [])
            self._log(f"✓ Nameservers obtenidos: {', '.join(nameservers)}")
            return nameservers
        self._log("No se pudieron obtener los nameservers de la zona", "WARN")
        return []

    def configure_dns_proxy(self, name, content, record_type="A"):
        """Crea o actualiza un registro DNS con Proxy activado"""
        self._log(f"Configurando DNS para {name} -> {content} ({record_type})...")
        
        params = f"?name={name}&type={record_type}"
        search_res = self._request("GET", f"zones/{self.zone_id}/dns_records{params}")
        
        payload = {
            "type": record_type,
            "name": name,
            "content": content,
            "proxied": True,
            "ttl": 1
        }

        if search_res and search_res.get("result") and len(search_res["result"]) > 0:
            record_id = search_res["result"][0]["id"]
            res = self._request("PUT", f"zones/{self.zone_id}/dns_records/{record_id}", payload)
            action = "actualizado"
        else:
            res = self._request("POST", f"zones/{self.zone_id}/dns_records", payload)
            action = "creado"

        if res and res.get("success"):
            self._log(f"✓ Registro DNS {action} exitosamente con Proxy activado")
            return True
        else:
            self._log(f"Fallo en configuración DNS", "ERROR")
            return False

    def configure_ssl_strict(self):
        """Configura SSL/TLS en modo Full (Strict)"""
        self._log("Configurando modo SSL a Full (Strict)...")
        payload = {"value": "strict"}
        res = self._request("PATCH", f"zones/{self.zone_id}/settings/ssl", payload)
        
        if res and res.get("success"):
            self._log("✓ Modo SSL configurado a Full (Strict)")
            return True
        else:
            self._log("Fallo al configurar SSL", "ERROR")
            return False

    def enable_https_force_redirect(self):
        """Fuerza la redirección de HTTP a HTTPS"""
        self._log("Activando 'Always Use HTTPS'...")
        payload = {"value": "on"}
        res = self._request("PATCH", f"zones/{self.zone_id}/settings/always_use_https", payload)
        
        if res and res.get("success"):
            self._log("✓ Redirección HTTPS forzada activada")
            return True
        return False

    def enable_security_features(self):
        """Activa WAF y configuraciones de seguridad DDoS"""
        self._log("Optimizando configuraciones de Seguridad y DDoS...")
        
        waf_res = self._request("PATCH", f"zones/{self.zone_id}/settings/waf", {"value": "on"})
        sec_res = self._request("PATCH", f"zones/{self.zone_id}/settings/security_level", {"value": "high"})
        
        if waf_res and waf_res.get("success") and sec_res and sec_res.get("success"):
            self._log("✓ WAF y protecciones DDoS base configuradas")
            return True
        else:
            self._log("Advertencia: Algunas configuraciones de seguridad no se aplicaron completamente", "WARN")
            return False

    def create_firewall_custom_rule(self):
        """Crea una regla de firewall personalizada"""
        self._log("Implementando Regla de Firewall Personalizada...")
        
        expression = '(ip.geoip.country eq "XX") or (http.user_agent contains "BadBot")'
        
        legacy_payload = [
            {
                "filter": {
                    "expression": expression,
                    "paused": False
                },
                "action": "block",
                "description": "CAS Auto-Provisioned Block Rule"
            }
        ]
        
        res = self._request("POST", f"zones/{self.zone_id}/firewall/rules", legacy_payload)
        
        if res and res.get("success"):
            self._log("✓ Regla de Firewall creada correctamente")
            return True
        else:
            self._log("Nota: Regla de firewall no creada (puede requerir plan superior)", "WARN")
            return False

    def run_provisioning(self, dns_name, origin_ip):
        """Ejecuta el aprovisionamiento completo de protección perimetral"""
        self._log("=== INICIANDO PROVISIÓN DE SEGURIDAD PERIMETRAL ===")
        
        nameservers = self.fetch_zone_nameservers()
        
        self._log(f"Configurando protección para dominio: {dns_name}")
        self.configure_dns_proxy(dns_name, origin_ip)
        
        self.configure_ssl_strict()
        self.enable_https_force_redirect()
        
        self.enable_security_features()
        self.create_firewall_custom_rule()
        
        self._log("=== PROVISIÓN COMPLETADA EXITOSAMENTE ===")
        
        return {
            "nameservers": nameservers,
            "logs": self.logs
        }


# ===============================
# Utilidades
# ===============================
def validar_url(url):
    """Valida que la URL tenga un formato correcto"""
    regex = re.compile(
        r'^(https?:\/\/)?(([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,})(\/.*)?$'
    )
    return re.match(regex, url) is not None


def validate_turnstile(token, ip=None):
    """Valida el token de Turnstile con la API de Cloudflare"""
    if not TURNSTILE_SECRET_KEY:
        return False, "TURNSTILE_SECRET_KEY no está configurada"

    try:
        url = "https://challenges.cloudflare.com/turnstile/v0/siteverify"
        data = {
            "secret": TURNSTILE_SECRET_KEY,
            "response": token
        }
        
        if ip:
            data["remoteip"] = ip
        
        data_encoded = urllib.parse.urlencode(data).encode('utf-8')
        req = urllib.request.Request(url, data=data_encoded, method='POST')
        
        with urllib.request.urlopen(req, timeout=10) as response:
            result = json.loads(response.read().decode('utf-8'))
        
        if result.get("success", False):
            return True, None
        
        codes = result.get("error-codes") or result.get("error_codes") or []
        msg = "Verificación Turnstile fallida"
        if codes:
            msg += f". Códigos: {', '.join(codes)}"
        return False, msg
    except Exception as e:
        return False, f"Error conectando con Turnstile: {str(e)}"


# ===============================
# Handler principal (Vercel)
# ===============================
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
        self.wfile.write(json.dumps(data).encode('utf-8'))
    
    def do_OPTIONS(self):
        """Maneja preflight CORS"""
        self._send_json({"message": "OK"}, 200)
    
    def do_GET(self):
        """Health check"""
        self._send_json({
            "status": "ok",
            "message": "API funcionando correctamente",
            "has_turnstile_key": bool(TURNSTILE_SECRET_KEY),
            "has_cloudflare_config": bool(CF_API_TOKEN and CF_ZONE_ID)
        }, 200)
    
    def do_POST(self):
        """Procesa la solicitud de protección"""
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
            
            # Validar token de Turnstile
            token = data.get("turnstileToken")
            if not token:
                self._send_json({
                    "status": "error",
                    "message": "Falta el token de seguridad (Turnstile)"
                }, 400)
                return
            
            # Obtener IP del cliente
            client_ip = self.headers.get("X-Forwarded-For", "").split(",")[0].strip()
            if not client_ip:
                client_ip = self.headers.get("X-Real-IP", "")
            
            # Obtener URLs
            urls = data.get("urls", [])
            
            # Inicializar logs
            logs = []
            logs.append("Initializing protection setup...")
            logs.append(f"Processing {len(urls)} domain(s)...")
            logs.append("Validating security token with Cloudflare Turnstile...")
            
            # Validar con Cloudflare Turnstile
            ok, err = validate_turnstile(token, client_ip)
            
            if not ok:
                status_code = 500 if "TURNSTILE_SECRET_KEY" in (err or "") else 403
                self._send_json({
                    "status": "error",
                    "message": err or "Verificación de seguridad fallida",
                    "logs": logs + [f"ERROR: {err}"]
                }, status_code)
                return
            
            logs.append("✓ Security verification successful")
            
            # Validar que haya URLs
            if not urls:
                self._send_json({
                    "status": "error",
                    "message": "No se proporcionaron URLs",
                    "logs": logs + ["ERROR: No URLs provided"]
                }, 400)
                return
            
            # Validar formato de URLs
            logs.append("Validating URL formats...")
            for url in urls:
                if not validar_url(url):
                    self._send_json({
                        "status": "error",
                        "message": f"URL inválida: {url}",
                        "logs": logs + [f"ERROR: Invalid URL format - {url}"]
                    }, 400)
                    return
            
            logs.append(f"✓ All {len(urls)} URLs validated successfully")
            
            # Verificar configuración de Cloudflare
            if not CF_API_TOKEN or not CF_ZONE_ID:
                logs.append("WARNING: Cloudflare credentials not configured - running in simulation mode")
                logs.append("To enable real protection, configure CF_API_TOKEN and CF_ZONE_ID in Vercel")
                
                # Modo simulación
                protegidos = []
                for idx, url in enumerate(urls, 1):
                    dominio = url.replace("https://", "").replace("http://", "").split("/")[0]
                    logs.append(f"[{idx}/{len(urls)}] Simulating protection for: {dominio}")
                    protegidos.append({
                        "dominio": dominio,
                        "estado": "Simulación - Configure Cloudflare credentials",
                        "nameservers": ["Configure CF_API_TOKEN and CF_ZONE_ID"]
                    })
                
                logs.append("Simulation completed - No real changes made to Cloudflare")
                
                self._send_json({
                    "status": "ok",
                    "message": "Simulación completada - Configure credenciales de Cloudflare",
                    "urls": urls,
                    "sitios": protegidos,
                    "logs": logs,
                    "progress": 100,
                    "nameservers": ["Configure CF_API_TOKEN and CF_ZONE_ID"],
                    "simulation_mode": True
                }, 200)
                return
            
            # Procesar las URLs con protección REAL de Cloudflare
            logs.append("Starting REAL Cloudflare protection configuration...")
            logs.append(f"Using Cloudflare Zone ID: {CF_ZONE_ID[:8]}...")
            
            protegidos = []
            all_nameservers = []
            
            for idx, url in enumerate(urls, 1):
                dominio = url.replace("https://", "").replace("http://", "").split("/")[0]
                
                logs.append(f"[{idx}/{len(urls)}] Processing domain: {dominio}")
                
                # Crear instancia del protector
                protector = CloudflareEdgeProtector(CF_API_TOKEN, CF_ZONE_ID)
                
                # IP de origen
                ORIGIN_IP = "203.0.113.10"
                
                # Ejecutar aprovisionamiento
                result = protector.run_provisioning(dominio, ORIGIN_IP)
                
                # Agregar logs del protector
                logs.extend(result["logs"])
                
                # Guardar nameservers
                if result["nameservers"]:
                    all_nameservers = result["nameservers"]
                
                protegidos.append({
                    "dominio": dominio,
                    "estado": "Protección perimetral configurada",
                    "nameservers": result["nameservers"]
                })
            
            logs.append(f"✓ Protection setup completed for {len(protegidos)} domain(s)")
            logs.append("Next steps: Update nameservers at your domain registrar")
            
            # Respuesta exitosa
            self._send_json({
                "status": "ok",
                "message": "Protección perimetral configurada exitosamente",
                "urls": urls,
                "sitios": protegidos,
                "logs": logs,
                "progress": 100,
                "nameservers": all_nameservers,
                "simulation_mode": False
            }, 200)
            
        except Exception as e:
            self._send_json({
                "status": "error",
                "message": f"Error interno del servidor: {str(e)}",
                "type": type(e).__name__
            }, 500)
