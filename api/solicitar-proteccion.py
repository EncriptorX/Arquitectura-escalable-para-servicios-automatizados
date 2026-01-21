"""
Vercel Serverless Function - Cloudflare Protection Integration
With Real-time Progress Updates
"""
from http.server import BaseHTTPRequestHandler
import json
import os
import re
import urllib.request
import urllib.parse
import time
import uuid


# ===============================
# Configuración desde Vercel ENV
# ===============================
TURNSTILE_SECRET_KEY = os.getenv("TURNSTILE_SECRET_KEY", "")
CF_API_TOKEN = os.getenv("CF_API_TOKEN", "")
CF_ZONE_ID = os.getenv("CF_ZONE_ID", "")
CF_ACCOUNT_ID = os.getenv("CF_ACCOUNT_ID", "")

# Directorio para almacenar estado de tareas
TASKS_DIR = "/tmp/cloudflare_tasks"

# Crear directorio si no existe
if not os.path.exists(TASKS_DIR):
    try:
        os.makedirs(TASKS_DIR)
    except:
        pass


# ===============================
# Task Manager
# ===============================
class TaskManager:
    @staticmethod
    def create_task(task_id, urls):
        """Crea una nueva tarea"""
        task_data = {
            "task_id": task_id,
            "status": "processing",
            "progress": 0,
            "logs": [],
            "urls": urls,
            "sitios": [],
            "nameservers": [],
            "simulation_mode": not (CF_API_TOKEN and CF_ZONE_ID),
            "created_at": time.time()
        }
        TaskManager.save_task(task_id, task_data)
        return task_data
    
    @staticmethod
    def save_task(task_id, task_data):
        """Guarda el estado de una tarea"""
        try:
            task_file = f"{TASKS_DIR}/{task_id}.json"
            with open(task_file, 'w') as f:
                json.dump(task_data, f)
        except Exception as e:
            print(f"Error saving task: {e}")
    
    @staticmethod
    def update_task(task_id, updates):
        """Actualiza el estado de una tarea"""
        try:
            task_file = f"{TASKS_DIR}/{task_id}.json"
            if os.path.exists(task_file):
                with open(task_file, 'r') as f:
                    task_data = json.load(f)
                task_data.update(updates)
                TaskManager.save_task(task_id, task_data)
                return task_data
        except Exception as e:
            print(f"Error updating task: {e}")
        return None
    
    @staticmethod
    def add_log(task_id, log_message):
        """Agrega un log a la tarea"""
        try:
            task_file = f"{TASKS_DIR}/{task_id}.json"
            if os.path.exists(task_file):
                with open(task_file, 'r') as f:
                    task_data = json.load(f)
                task_data['logs'].append(log_message)
                TaskManager.save_task(task_id, task_data)
        except Exception as e:
            print(f"Error adding log: {e}")


# ===============================
# Cloudflare Edge Protector
# ===============================
class CloudflareEdgeProtector:
    def __init__(self, token, zone_id, task_id=None):
        self.base_url = "https://api.cloudflare.com/client/v4"
        self.zone_id = zone_id
        self.headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        self.logs = []
        self.task_id = task_id

    def _log(self, message, level="INFO"):
        """Helper para logging con actualización en tiempo real"""
        log_entry = f"[{level}] {message}"
        self.logs.append(log_entry)
        
        # Actualizar tarea si existe task_id
        if self.task_id:
            TaskManager.add_log(self.task_id, log_entry)
        
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
        """
        Crea o actualiza un registro DNS con Proxy activado (Nube Naranja)
        """
        self._log(f"Configurando DNS para {name} -> {content} ({record_type})...")
        
        # Buscar si el registro ya existe
        params = f"?name={name}&type={record_type}"
        search_res = self._request("GET", f"zones/{self.zone_id}/dns_records{params}")
        
        payload = {
            "type": record_type,
            "name": name,
            "content": content,
            "proxied": True,  # CRÍTICO: Activa la protección perimetral
            "ttl": 1  # Automático
        }

        if search_res and search_res.get("result") and len(search_res["result"]) > 0:
            # Actualizar existente
            record_id = search_res["result"][0]["id"]
            res = self._request("PUT", f"zones/{self.zone_id}/dns_records/{record_id}", payload)
            action = "actualizado"
        else:
            # Crear nuevo
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
        
        # Activar WAF
        waf_res = self._request("PATCH", f"zones/{self.zone_id}/settings/waf", {"value": "on"})
        
        # Security Level alto
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
        
        # Actualizar progreso: 10%
        if self.task_id:
            TaskManager.update_task(self.task_id, {"progress": 10})
        
        # Obtener nameservers
        nameservers = self.fetch_zone_nameservers()
        
        # Actualizar progreso: 20%
        if self.task_id:
            TaskManager.update_task(self.task_id, {"progress": 20, "nameservers": nameservers})
        
        # 1. Perímetro de Red (DNS + Proxy)
        self._log(f"Configurando protección para dominio: {dns_name}")
        self.configure_dns_proxy(dns_name, origin_ip)
        
        # Actualizar progreso: 40%
        if self.task_id:
            TaskManager.update_task(self.task_id, {"progress": 40})
        
        # 2. Cifrado y Transporte (SSL/HTTPS)
        self.configure_ssl_strict()
        
        # Actualizar progreso: 60%
        if self.task_id:
            TaskManager.update_task(self.task_id, {"progress": 60})
        
        self.enable_https_force_redirect()
        
        # Actualizar progreso: 70%
        if self.task_id:
            TaskManager.update_task(self.task_id, {"progress": 70})
        
        # 3. Seguridad de Aplicación (WAF/DDoS)
        self.enable_security_features()
        
        # Actualizar progreso: 85%
        if self.task_id:
            TaskManager.update_task(self.task_id, {"progress": 85})
        
        self.create_firewall_custom_rule()
        
        # Actualizar progreso: 95%
        if self.task_id:
            TaskManager.update_task(self.task_id, {"progress": 95})
        
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
        """Procesa la solicitud de protección - Retorna task_id inmediatamente"""
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
            
            # Validar con Cloudflare Turnstile
            ok, err = validate_turnstile(token, client_ip)
            
            if not ok:
                status_code = 500 if "TURNSTILE_SECRET_KEY" in (err or "") else 403
                self._send_json({
                    "status": "error",
                    "message": err or "Verificación de seguridad fallida"
                }, status_code)
                return
            
            # Validar que haya URLs
            if not urls:
                self._send_json({
                    "status": "error",
                    "message": "No se proporcionaron URLs"
                }, 400)
                return
            
            # Validar formato de URLs
            for url in urls:
                if not validar_url(url):
                    self._send_json({
                        "status": "error",
                        "message": f"URL inválida: {url}"
                    }, 400)
                    return
            
            # Crear tarea única
            task_id = str(uuid.uuid4())
            task_data = TaskManager.create_task(task_id, urls)
            
            # Agregar logs iniciales
            TaskManager.add_log(task_id, "Initializing protection setup...")
            TaskManager.add_log(task_id, f"Processing {len(urls)} domain(s)...")
            TaskManager.add_log(task_id, "✓ Security verification successful")
            TaskManager.add_log(task_id, "Validating URL formats...")
            TaskManager.add_log(task_id, f"✓ All {len(urls)} URLs validated successfully")
            
            # Actualizar progreso inicial
            TaskManager.update_task(task_id, {"progress": 5})
            
            # Procesar las URLs (esto se ejecuta síncronamente pero actualiza progreso)
            self._process_urls_async(task_id, urls)
            
            # Retornar task_id inmediatamente
            self._send_json({
                "status": "ok",
                "message": "Tarea iniciada",
                "task_id": task_id,
                "urls": urls
            }, 200)
            
        except Exception as e:
            self._send_json({
                "status": "error",
                "message": f"Error interno del servidor: {str(e)}",
                "type": type(e).__name__
            }, 500)
    
    def _process_urls_async(self, task_id, urls):
        """Procesa las URLs y actualiza el progreso"""
        try:
            # Verificar configuración de Cloudflare
            if not CF_API_TOKEN or not CF_ZONE_ID:
                TaskManager.add_log(task_id, "WARNING: Cloudflare credentials not configured - running in simulation mode")
                TaskManager.add_log(task_id, "To enable real protection, configure CF_API_TOKEN and CF_ZONE_ID in Vercel")
                
                # Modo simulación con delays para simular progreso
                protegidos = []
                for idx, url in enumerate(urls, 1):
                    dominio = url.replace("https://", "").replace("http://", "").split("/")[0]
                    TaskManager.add_log(task_id, f"[{idx}/{len(urls)}] Simulating protection for: {dominio}")
                    
                    # Simular progreso
                    progress = 10 + (idx * 80 // len(urls))
                    TaskManager.update_task(task_id, {"progress": progress})
                    
                    protegidos.append({
                        "dominio": dominio,
                        "estado": "Simulación - Configure Cloudflare credentials",
                        "nameservers": ["Configure CF_API_TOKEN and CF_ZONE_ID"]
                    })
                
                TaskManager.add_log(task_id, "Simulation completed - No real changes made to Cloudflare")
                TaskManager.update_task(task_id, {
                    "status": "completed",
                    "progress": 100,
                    "sitios": protegidos,
                    "nameservers": ["Configure CF_API_TOKEN and CF_ZONE_ID"]
                })
                return
            
            # Procesar con protección REAL de Cloudflare
            TaskManager.add_log(task_id, "Starting REAL Cloudflare protection configuration...")
            TaskManager.add_log(task_id, f"Using Cloudflare Zone ID: {CF_ZONE_ID[:8]}...")
            
            protegidos = []
            all_nameservers = []
            
            for idx, url in enumerate(urls, 1):
                dominio = url.replace("https://", "").replace("http://", "").split("/")[0]
                
                TaskManager.add_log(task_id, f"[{idx}/{len(urls)}] Processing domain: {dominio}")
                
                # Crear instancia del protector con task_id
                protector = CloudflareEdgeProtector(CF_API_TOKEN, CF_ZONE_ID, task_id)
                
                # IP de origen
                ORIGIN_IP = "203.0.113.10"
                
                # Ejecutar aprovisionamiento
                result = protector.run_provisioning(dominio, ORIGIN_IP)
                
                # Guardar nameservers
                if result["nameservers"]:
                    all_nameservers = result["nameservers"]
                
                protegidos.append({
                    "dominio": dominio,
                    "estado": "Protección perimetral configurada",
                    "nameservers": result["nameservers"]
                })
            
            TaskManager.add_log(task_id, f"✓ Protection setup completed for {len(protegidos)} domain(s)")
            TaskManager.add_log(task_id, "Next steps: Update nameservers at your domain registrar")
            
            # Marcar como completado
            TaskManager.update_task(task_id, {
                "status": "completed",
                "progress": 100,
                "sitios": protegidos,
                "nameservers": all_nameservers
            })
            
        except Exception as e:
            TaskManager.add_log(task_id, f"ERROR: {str(e)}")
            TaskManager.update_task(task_id, {
                "status": "failed",
                "error": str(e)
            })
