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
import socket


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
                
                # Proporcionar contexto adicional según el código de error
                if err.code == 403:
                    self._log("Posible causa: Token de API sin permisos suficientes", "WARN")
                    self._log("Solución: Verifica que el token tenga permisos para esta operación", "WARN")
                elif err.code == 429:
                    self._log("Posible causa: Límite de rate limit alcanzado", "WARN")
                    self._log("Solución: Espera unos minutos antes de reintentar", "WARN")
                elif err.code == 404:
                    self._log("Posible causa: Recurso no encontrado o zona incorrecta", "WARN")
                    self._log("Solución: Verifica el CF_ZONE_ID en la configuración", "WARN")
            except:
                pass
            return None
        except urllib.error.URLError as e:
            self._log(f"Error de conexión: {str(e.reason)}", "ERROR")
            self._log("Posible causa: Problemas de red o API de Cloudflare no disponible", "WARN")
            self._log("Solución: Verifica tu conexión a internet y reintenta", "WARN")
            return None
        except Exception as e:
            self._log(f"Error en request: {str(e)}", "ERROR")
            return None

    def fetch_zone_info(self):
        """Obtiene información de la zona incluyendo nameservers y nombre"""
        self._log("Obteniendo información de la zona de Cloudflare...")
        res = self._request("GET", f"zones/{self.zone_id}")
        if res and res.get("success"):
            zone_data = res["result"]
            zone_name = zone_data.get("name", "")
            nameservers = zone_data.get("name_servers", [])
            self._log(f"✓ Zona: {zone_name}")
            self._log(f"✓ Nameservers: {', '.join(nameservers)}")
            return {
                "name": zone_name,
                "nameservers": nameservers
            }
        self._log("No se pudo obtener información de la zona", "ERROR")
        self._log("Posible causa: CF_ZONE_ID incorrecto o token sin permisos", "WARN")
        self._log("Solución: Verifica CF_ZONE_ID en la configuración de Vercel", "WARN")
        return None
    
    def validate_domain_in_zone(self, domain, zone_name):
        """Valida que el dominio pertenezca a la zona configurada"""
        # El dominio debe ser igual a la zona o un subdominio de ella
        if domain == zone_name:
            return True
        if domain.endswith(f".{zone_name}"):
            return True
        return False

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
            self._log(f"Error al configurar DNS Proxy", "ERROR")
            self._log(f"Impacto: El dominio {name} NO estará protegido por Cloudflare", "ERROR")
            self._log("Posible causa: Permisos insuficientes o error de API", "WARN")
            return False

    def configure_ssl_strict(self):
        """Configura SSL/TLS en modo Full (Strict) - IDEMPOTENTE"""
        self._log("Verificando configuración SSL...")
        
        # Primero verificar el estado actual
        get_res = self._request("GET", f"zones/{self.zone_id}/settings/ssl")
        
        if get_res and get_res.get("success"):
            current_value = get_res["result"].get("value")
            
            if current_value == "strict":
                self._log("✓ Modo SSL ya está configurado en Full (Strict)")
                return True
            
            self._log(f"Modo SSL actual: {current_value}, cambiando a 'strict'...")
        else:
            self._log("Configurando modo SSL a Full (Strict)...")
        
        # Aplicar configuración
        payload = {"value": "strict"}
        res = self._request("PATCH", f"zones/{self.zone_id}/settings/ssl", payload)
        
        if res and res.get("success"):
            self._log("✓ Modo SSL configurado a Full (Strict)")
            return True
        else:
            self._log("Advertencia: No se pudo configurar SSL", "WARN")
            self._log("Impacto: Conexiones pueden no estar completamente cifradas", "WARN")
            self._log("Recomendación: Configura SSL manualmente en el panel de Cloudflare", "WARN")
            return False

    def enable_https_force_redirect(self):
        """Fuerza la redirección de HTTP a HTTPS - IDEMPOTENTE"""
        self._log("Verificando redirección HTTPS...")
        
        # Verificar estado actual
        get_res = self._request("GET", f"zones/{self.zone_id}/settings/always_use_https")
        
        if get_res and get_res.get("success"):
            current_value = get_res["result"].get("value")
            
            if current_value == "on":
                self._log("✓ Redirección HTTPS ya está activada")
                return True
            
            self._log("Activando 'Always Use HTTPS'...")
        else:
            self._log("Activando 'Always Use HTTPS'...")
        
        # Aplicar configuración
        payload = {"value": "on"}
        res = self._request("PATCH", f"zones/{self.zone_id}/settings/always_use_https", payload)
        
        if res and res.get("success"):
            self._log("✓ Redirección HTTPS forzada activada")
            return True
        else:
            self._log("Advertencia: No se pudo activar redirección HTTPS", "WARN")
            return False

    def enable_security_features(self):
        """Activa WAF y configuraciones de seguridad DDoS - IDEMPOTENTE"""
        self._log("Verificando configuraciones de Seguridad y DDoS...")
        
        success_count = 0
        total_count = 2
        
        # Verificar y configurar WAF
        waf_get = self._request("GET", f"zones/{self.zone_id}/settings/waf")
        if waf_get and waf_get.get("success"):
            current_waf = waf_get["result"].get("value")
            if current_waf == "on":
                self._log("✓ WAF ya está activado")
                success_count += 1
            else:
                self._log("Activando WAF...")
                waf_res = self._request("PATCH", f"zones/{self.zone_id}/settings/waf", {"value": "on"})
                if waf_res and waf_res.get("success"):
                    self._log("✓ WAF activado")
                    success_count += 1
                else:
                    self._log("Advertencia: No se pudo activar WAF", "WARN")
        else:
            # Intentar activar sin verificar
            waf_res = self._request("PATCH", f"zones/{self.zone_id}/settings/waf", {"value": "on"})
            if waf_res and waf_res.get("success"):
                self._log("✓ WAF activado")
                success_count += 1
        
        # Verificar y configurar Security Level
        sec_get = self._request("GET", f"zones/{self.zone_id}/settings/security_level")
        if sec_get and sec_get.get("success"):
            current_sec = sec_get["result"].get("value")
            if current_sec == "high":
                self._log("✓ Security Level ya está en 'high'")
                success_count += 1
            else:
                self._log(f"Security Level actual: {current_sec}, cambiando a 'high'...")
                sec_res = self._request("PATCH", f"zones/{self.zone_id}/settings/security_level", {"value": "high"})
                if sec_res and sec_res.get("success"):
                    self._log("✓ Security Level configurado a 'high'")
                    success_count += 1
                else:
                    self._log("Advertencia: No se pudo configurar Security Level", "WARN")
        else:
            # Intentar configurar sin verificar
            sec_res = self._request("PATCH", f"zones/{self.zone_id}/settings/security_level", {"value": "high"})
            if sec_res and sec_res.get("success"):
                self._log("✓ Security Level configurado a 'high'")
                success_count += 1
        
        if success_count == total_count:
            self._log("✓ Todas las protecciones de seguridad configuradas")
            return True
        elif success_count > 0:
            self._log(f"Advertencia: Solo {success_count}/{total_count} configuraciones aplicadas", "WARN")
            return True  # Tolerante a fallos parciales
        else:
            self._log("Advertencia: No se pudieron aplicar configuraciones de seguridad", "WARN")
            return False

    def create_firewall_custom_rule(self):
        """Crea o actualiza una regla de firewall personalizada (IDEMPOTENTE)"""
        self._log("Verificando Regla de Firewall Personalizada...")
        
        rule_description = "CAS Auto-Provisioned Block Rule"
        expression = '(ip.geoip.country eq "XX") or (http.user_agent contains "BadBot")'
        
        # Primero, buscar si la regla ya existe
        search_res = self._request("GET", f"zones/{self.zone_id}/firewall/rules")
        
        if search_res and search_res.get("success"):
            existing_rules = search_res.get("result", [])
            existing_rule = None
            
            # Buscar regla existente por descripción
            for rule in existing_rules:
                if rule.get("description") == rule_description:
                    existing_rule = rule
                    break
            
            if existing_rule:
                # La regla ya existe, verificar si necesita actualización
                rule_id = existing_rule["id"]
                current_paused = existing_rule.get("paused", False)
                
                if current_paused:
                    # Reactivar la regla si está pausada
                    self._log(f"Regla existente encontrada (pausada), reactivando...")
                    update_payload = {
                        "filter": existing_rule["filter"],
                        "action": existing_rule["action"],
                        "description": rule_description,
                        "paused": False
                    }
                    res = self._request("PUT", f"zones/{self.zone_id}/firewall/rules/{rule_id}", update_payload)
                    
                    if res and res.get("success"):
                        self._log("✓ Regla de Firewall reactivada correctamente")
                        return True
                    else:
                        self._log("Advertencia: No se pudo reactivar la regla de firewall", "WARN")
                        return False
                else:
                    self._log("✓ Regla de Firewall ya existe y está activa")
                    return True
        
        # Si no existe, crear nueva regla
        self._log("Creando nueva Regla de Firewall...")
        legacy_payload = [
            {
                "filter": {
                    "expression": expression,
                    "paused": False
                },
                "action": "block",
                "description": rule_description
            }
        ]
        
        res = self._request("POST", f"zones/{self.zone_id}/firewall/rules", legacy_payload)
        
        if res and res.get("success"):
            self._log("✓ Regla de Firewall creada correctamente")
            return True
        else:
            # Verificar si el error es por límite de plan
            errors = res.get("errors", []) if res else []
            if errors and any(err.get("code") in [1003, 10000] for err in errors):
                self._log("Nota: Firewall Rules no disponible en tu plan actual", "WARN")
                self._log("Restricción: Esta funcionalidad requiere plan Pro o superior", "WARN")
                self._log("Impacto: No se aplicarán reglas de firewall personalizadas", "WARN")
                self._log("Alternativa: Las protecciones básicas (WAF, DDoS) siguen activas", "WARN")
            else:
                self._log("Advertencia: No se pudo crear la regla de firewall", "WARN")
                self._log("Posible causa: Permisos insuficientes o límite alcanzado", "WARN")
            return False

    def run_provisioning(self, dns_name, origin_ip, zone_name):
        """
        Ejecuta el aprovisionamiento completo de protección perimetral
        IDEMPOTENTE y TOLERANTE A FALLOS
        """
        self._log("=== INICIANDO PROVISIÓN DE SEGURIDAD PERIMETRAL ===")
        
        # Validar que el dominio pertenece a la zona
        if not self.validate_domain_in_zone(dns_name, zone_name):
            self._log(f"ERROR: El dominio '{dns_name}' no pertenece a la zona '{zone_name}'", "ERROR")
            self._log(f"Solo puede proteger dominios que sean '{zone_name}' o subdominios como 'app.{zone_name}'", "ERROR")
            return {
                "success": False,
                "error": f"Dominio no válido para esta zona. Use '{zone_name}' o subdominios.",
                "logs": self.logs
            }
        
        self._log(f"✓ Dominio '{dns_name}' validado para la zona '{zone_name}'")
        
        # Contador de operaciones exitosas
        operations = {
            "dns_proxy": False,
            "ssl_strict": False,
            "https_redirect": False,
            "security_features": False,
            "firewall_rules": False
        }
        
        # 1. Configurar DNS con Proxy (crítico)
        self._log(f"[1/5] Configurando DNS Proxy para dominio: {dns_name}")
        try:
            operations["dns_proxy"] = self.configure_dns_proxy(dns_name, origin_ip)
        except Exception as e:
            self._log(f"Error en DNS Proxy: {str(e)}", "ERROR")
            operations["dns_proxy"] = False
        
        # 2. Configurar SSL/TLS (importante pero no crítico)
        self._log("[2/5] Configurando SSL/TLS...")
        try:
            operations["ssl_strict"] = self.configure_ssl_strict()
        except Exception as e:
            self._log(f"Error en SSL: {str(e)}", "WARN")
            operations["ssl_strict"] = False
        
        # 3. Activar redirección HTTPS (importante pero no crítico)
        self._log("[3/5] Configurando redirección HTTPS...")
        try:
            operations["https_redirect"] = self.enable_https_force_redirect()
        except Exception as e:
            self._log(f"Error en HTTPS redirect: {str(e)}", "WARN")
            operations["https_redirect"] = False
        
        # 4. Activar protecciones de seguridad (importante pero no crítico)
        self._log("[4/5] Configurando protecciones de seguridad...")
        try:
            operations["security_features"] = self.enable_security_features()
        except Exception as e:
            self._log(f"Error en security features: {str(e)}", "WARN")
            operations["security_features"] = False
        
        # 5. Crear reglas de firewall (opcional, puede fallar por plan)
        self._log("[5/5] Configurando reglas de firewall...")
        try:
            operations["firewall_rules"] = self.create_firewall_custom_rule()
        except Exception as e:
            self._log(f"Error en firewall rules: {str(e)}", "WARN")
            operations["firewall_rules"] = False
        
        # Evaluar resultado
        critical_ops = ["dns_proxy"]
        important_ops = ["ssl_strict", "https_redirect", "security_features"]
        optional_ops = ["firewall_rules"]
        
        critical_success = all(operations[op] for op in critical_ops)
        important_count = sum(operations[op] for op in important_ops)
        
        if not critical_success:
            self._log("=== PROVISIÓN FALLIDA: Operaciones críticas no completadas ===", "ERROR")
            return {
                "success": False,
                "error": "No se pudo configurar DNS Proxy (operación crítica)",
                "operations": operations,
                "logs": self.logs
            }
        
        if important_count == len(important_ops):
            self._log("=== PROVISIÓN COMPLETADA EXITOSAMENTE (100%) ===")
            status = "complete"
        elif important_count > 0:
            self._log(f"=== PROVISIÓN COMPLETADA PARCIALMENTE ({important_count}/{len(important_ops)} operaciones importantes) ===", "WARN")
            status = "partial"
        else:
            self._log("=== PROVISIÓN COMPLETADA CON ADVERTENCIAS (solo operaciones críticas) ===", "WARN")
            status = "minimal"
        
        return {
            "success": True,
            "status": status,
            "operations": operations,
            "logs": self.logs
        }


# ===============================
# Utilidades
# ===============================
def validar_url(url):
    """Valida que la URL tenga un formato correcto de dominio FQDN"""
    if not url or not isinstance(url, str):
        return False
    
    # Rechazar URLs con esquemas
    if "://" in url:
        return False
    
    # Rechazar URLs con rutas
    if "/" in url:
        return False
    
    domain = url.strip()
    
    # Verificar si es una dirección IP
    ip_pattern = r"^(\d{1,3}\.){3}\d{1,3}$"
    if re.match(ip_pattern, domain):
        return False
    
    # Validar formato FQDN
    fqdn_pattern = r"^(?=.{1,253}$)(?!-)([A-Za-z0-9-]{1,63}(?<!-)\.)+[A-Za-z]{2,63}$"
    return bool(re.match(fqdn_pattern, domain))


def obtener_ip_origen(dominio):
    """
    Obtiene la IP real del dominio mediante DNS lookup.
    Esto es CRÍTICO para que la protección funcione correctamente.
    """
    try:
        # El dominio ya viene limpio (solo FQDN, sin esquemas ni rutas)
        ip = socket.gethostbyname(dominio)
        return ip, None
    except socket.gaierror as e:
        return None, f"No se pudo resolver el dominio {dominio}: {str(e)}"
    except Exception as e:
        return None, f"Error obteniendo IP del dominio: {str(e)}"


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
            
            # Obtener información de la zona PRIMERO
            temp_protector = CloudflareEdgeProtector(CF_API_TOKEN, CF_ZONE_ID)
            zone_info = temp_protector.fetch_zone_info()
            
            if not zone_info:
                self._send_json({
                    "status": "error",
                    "message": "No se pudo obtener información de la zona de Cloudflare",
                    "logs": logs + temp_protector.logs
                }, 500)
                return
            
            zone_name = zone_info["name"]
            all_nameservers = zone_info["nameservers"]
            
            logs.extend(temp_protector.logs)
            logs.append(f"✓ Zona configurada: {zone_name}")
            logs.append(f"✓ Solo se pueden proteger: {zone_name} y subdominios (ej: app.{zone_name})")
            
            protegidos = []
            
            for idx, url in enumerate(urls, 1):
                dominio = url.replace("https://", "").replace("http://", "").split("/")[0]
                
                logs.append(f"[{idx}/{len(urls)}] Processing domain: {dominio}")
                
                # CRÍTICO: Obtener la IP REAL del dominio del usuario
                logs.append(f"Resolving IP address for {dominio}...")
                origin_ip, error = obtener_ip_origen(dominio)
                
                if error:
                    logs.append(f"ERROR: {error}")
                    logs.append(f"Skipping {dominio} - Cannot resolve IP address")
                    protegidos.append({
                        "dominio": dominio,
                        "estado": f"Error: {error}",
                        "nameservers": []
                    })
                    continue
                
                logs.append(f"✓ Resolved {dominio} -> {origin_ip}")
                
                # Crear instancia del protector
                protector = CloudflareEdgeProtector(CF_API_TOKEN, CF_ZONE_ID)
                
                # Ejecutar aprovisionamiento con la IP REAL del usuario
                result = protector.run_provisioning(dominio, origin_ip, zone_name)
                
                # Agregar logs del protector
                logs.extend(result["logs"])
                
                # Verificar si hubo error
                if not result.get("success"):
                    protegidos.append({
                        "dominio": dominio,
                        "estado": f"Error: {result.get('error', 'Unknown error')}",
                        "nameservers": [],
                        "origin_ip": origin_ip
                    })
                else:
                    protegidos.append({
                        "dominio": dominio,
                        "estado": "Protección perimetral configurada",
                        "nameservers": all_nameservers,
                        "origin_ip": origin_ip
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
