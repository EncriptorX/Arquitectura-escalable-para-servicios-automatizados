"""
Vercel Serverless Function - Cloudflare Protection Integration
Aplica protección perimetral a dominios usando Cloudflare
"""
from http.server import BaseHTTPRequestHandler
import json
import os
import re
import urllib.request
import urllib.parse
import socket
import sys
from typing import Optional, Dict, Tuple, List

# Agregar el directorio api al path para importar config
sys.path.insert(0, os.path.dirname(__file__))

try:
    from config import is_service_enabled
except ImportError:
    # Fallback si no se puede importar
    def is_service_enabled():
        return True

try:
    from logger import (
        protection_logger,
        log_protection_request,
        log_dns_configuration,
        log_security_setting,
        log_firewall_rule,
        log_api_error,
        log_turnstile_verification
    )
    LOGGING_AVAILABLE = True
except ImportError:
    LOGGING_AVAILABLE = False
    # Fallback sin logging
    class DummyLogger:
        def info(self, *args, **kwargs): pass
        def warning(self, *args, **kwargs): pass
        def error(self, *args, **kwargs): pass
        def audit(self, *args, **kwargs): pass
    
    protection_logger = DummyLogger()
    log_protection_request = lambda *args, **kwargs: None
    log_dns_configuration = lambda *args, **kwargs: None
    log_security_setting = lambda *args, **kwargs: None
    log_firewall_rule = lambda *args, **kwargs: None
    log_api_error = lambda *args, **kwargs: None
    log_turnstile_verification = lambda *args, **kwargs: None


# ===============================
# Configuración
# ===============================
class Config:
    """Configuración centralizada"""
    TURNSTILE_SECRET_KEY = os.getenv("TURNSTILE_SECRET_KEY", "")
    CF_API_TOKEN = os.getenv("CF_API_TOKEN", "")
    CF_ZONE_ID = os.getenv("CF_ZONE_ID", "")
    API_TIMEOUT = 30
    TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"
    CF_API_BASE_URL = "https://api.cloudflare.com/client/v4"
    
    # Patrones compilados para mejor rendimiento
    FQDN_PATTERN = re.compile(r"^(?=.{1,253}$)(?!-)([A-Za-z0-9-]{1,63}(?<!-)\.)+[A-Za-z]{2,63}$")
    IP_PATTERN = re.compile(r"^(\d{1,3}\.){3}\d{1,3}$")
    
    # Mapeo de errores HTTP
    ERROR_HINTS = {
        403: "Token sin permisos suficientes. Verifica permisos del token",
        429: "Límite de rate limit alcanzado. Espera unos minutos",
        404: "Recurso no encontrado. Verifica CF_ZONE_ID"
    }


# ===============================
# Utilidades
# ===============================
def validate_fqdn(domain: str) -> bool:
    """Valida formato FQDN (optimizado con patrones precompilados)"""
    if not domain or not isinstance(domain, str) or "://" in domain or "/" in domain:
        return False
    return not Config.IP_PATTERN.match(domain) and bool(Config.FQDN_PATTERN.match(domain))


def validate_domain_in_zone(domain: str, zone_name: str) -> bool:
    """Valida que el dominio pertenezca a la zona"""
    return domain == zone_name or domain.endswith(f".{zone_name}")


def resolve_domain_ip(domain: str) -> Tuple[Optional[str], Optional[str]]:
    """Resuelve la IP del dominio"""
    try:
        return socket.gethostbyname(domain), None
    except socket.gaierror as e:
        return None, f"No se pudo resolver el dominio {domain}: {str(e)}"
    except Exception as e:
        return None, f"Error obteniendo IP del dominio: {str(e)}"


def validate_turnstile(token: str, remote_ip: Optional[str] = None) -> Tuple[bool, Optional[str]]:
    """Valida token de Turnstile"""
    if not Config.TURNSTILE_SECRET_KEY:
        log_api_error("turnstile", "TURNSTILE_SECRET_KEY no configurada", "ConfigError")
        return False, "TURNSTILE_SECRET_KEY no está configurada"
    
    data = {"secret": Config.TURNSTILE_SECRET_KEY, "response": token}
    if remote_ip:
        data["remoteip"] = remote_ip
    
    try:
        req = urllib.request.Request(
            Config.TURNSTILE_VERIFY_URL,
            data=urllib.parse.urlencode(data).encode('utf-8'),
            method='POST'
        )
        with urllib.request.urlopen(req, timeout=10) as response:
            result = json.loads(response.read().decode('utf-8'))
        
        success = result.get("success", False)
        log_turnstile_verification(success=success, remote_ip=remote_ip)
        
        if success:
            return True, None
        
        codes = result.get("error-codes") or result.get("error_codes") or []
        msg = "Verificación Turnstile fallida"
        if codes:
            msg += f". Códigos: {', '.join(codes)}"
        
        log_turnstile_verification(success=False, remote_ip=remote_ip, error_codes=codes)
        return False, msg
    except Exception as e:
        error_msg = f"Error conectando con Turnstile: {str(e)}"
        log_api_error("turnstile", error_msg, type(e).__name__, remote_ip=remote_ip)
        return False, error_msg


# ===============================
# Cliente de Cloudflare API
# ===============================
class CloudflareClient:
    """Cliente simplificado para Cloudflare API"""
    
    def __init__(self, api_token: str, zone_id: str):
        self.api_token = api_token
        self.zone_id = zone_id
        self.logs = []
    
    def log(self, message: str, level: str = "INFO"):
        """Registra un mensaje"""
        self.logs.append(f"[{level}] {message}")
    
    def request(self, method: str, endpoint: str, data: Optional[Dict] = None) -> Optional[Dict]:
        """Realiza petición HTTP a Cloudflare API (optimizado)"""
        try:
            req = urllib.request.Request(
                f"{Config.CF_API_BASE_URL}/{endpoint}",
                data=json.dumps(data).encode('utf-8') if data else None,
                headers={"Authorization": f"Bearer {self.api_token}", "Content-Type": "application/json"},
                method=method
            )
            
            with urllib.request.urlopen(req, timeout=Config.API_TIMEOUT) as response:
                return json.loads(response.read().decode('utf-8'))
        
        except urllib.error.HTTPError as err:
            self.log(f"Error HTTP {err.code}: {err.reason}", "ERROR")
            try:
                self.log(f"Detalle: {json.dumps(json.loads(err.read().decode('utf-8')))}", "ERROR")
            except:
                pass
            if err.code in Config.ERROR_HINTS:
                self.log(Config.ERROR_HINTS[err.code], "WARN")
            return None
        except urllib.error.URLError as e:
            self.log(f"Error de conexión: {str(e.reason)}", "ERROR")
            return None
        except Exception as e:
            self.log(f"Error en request: {str(e)}", "ERROR")
            return None
    
    def get_zone_info(self) -> Optional[Dict]:
        """Obtiene información de la zona (optimizado)"""
        self.log("Obteniendo información de la zona...")
        res = self.request("GET", f"zones/{self.zone_id}")
        
        if res and res.get("success"):
            zone_data = res["result"]
            info = {"name": zone_data.get("name", ""), "nameservers": zone_data.get("name_servers", [])}
            self.log(f"✓ Zona: {info['name']}")
            self.log(f"✓ Nameservers: {', '.join(info['nameservers'])}")
            return info
        
        self.log("No se pudo obtener información de la zona", "ERROR")
        return None
    
    def configure_dns_proxy(self, name: str, content: str, record_type: str = "A") -> bool:
        """Configura DNS con proxy activado (IDEMPOTENTE, optimizado)"""
        self.log(f"Configurando DNS para {name} -> {content} ({record_type})...")
        
        # Buscar registro existente
        search_res = self.request("GET", f"zones/{self.zone_id}/dns_records?name={name}&type={record_type}")
        payload = {"type": record_type, "name": name, "content": content, "proxied": True, "ttl": 1}
        
        # Actualizar o crear (operador ternario para eficiencia)
        existing = search_res and search_res.get("result") and search_res["result"]
        if existing:
            res = self.request("PUT", f"zones/{self.zone_id}/dns_records/{existing[0]['id']}", payload)
            action = "actualizado"
        else:
            res = self.request("POST", f"zones/{self.zone_id}/dns_records", payload)
            action = "creado"
        
        success = res and res.get("success")
        
        if success:
            self.log(f"✓ Registro DNS {action} exitosamente con Proxy activado")
            log_dns_configuration(
                domain=name,
                record_type=record_type,
                content=content,
                proxied=True,
                action=action,
                zone_id=self.zone_id
            )
        else:
            self.log("Error al configurar DNS Proxy", "ERROR")
            log_api_error(
                "dns_configuration",
                f"Error al {action} DNS para {name}",
                "DNSConfigError",
                domain=name,
                zone_id=self.zone_id
            )
        
        return bool(success)
    
    def configure_setting(self, setting: str, value: any, label: str) -> bool:
        """Configura un setting de Cloudflare (IDEMPOTENTE, optimizado)"""
        self.log(f"Verificando {label}...")
        
        # Verificar estado actual
        get_res = self.request("GET", f"zones/{self.zone_id}/settings/{setting}")
        
        if get_res and get_res.get("success") and get_res["result"].get("value") == value:
            self.log(f"✓ {label} ya está configurado correctamente")
            return True
        
        # Aplicar configuración
        previous_value = get_res["result"].get("value") if get_res and get_res.get("success") else None
        res = self.request("PATCH", f"zones/{self.zone_id}/settings/{setting}", {"value": value})
        success = res and res.get("success")
        
        if success:
            self.log(f"✓ {label} configurado exitosamente")
            log_security_setting(
                setting=setting,
                value=value,
                zone_id=self.zone_id,
                label=label,
                previous_value=previous_value
            )
        else:
            self.log(f"Advertencia: No se pudo configurar {label}", "WARN")
            log_api_error(
                "security_setting",
                f"Error configurando {label}",
                "SettingConfigError",
                setting=setting,
                zone_id=self.zone_id
            )
        
        return bool(success)
    
    def create_firewall_rule(self) -> bool:
        """Crea regla de firewall personalizada (IDEMPOTENTE, optimizado)"""
        self.log("Verificando Regla de Firewall...")
        
        rule_desc = "CAS Auto-Provisioned Block Rule"
        expr = '(ip.geoip.country eq "XX") or (http.user_agent contains "BadBot")'
        
        # Buscar regla existente
        search_res = self.request("GET", f"zones/{self.zone_id}/firewall/rules")
        
        if search_res and search_res.get("success"):
            existing = next((r for r in search_res.get("result", []) if r.get("description") == rule_desc), None)
            
            if existing:
                if existing.get("paused"):
                    # Reactivar regla pausada
                    res = self.request("PUT", f"zones/{self.zone_id}/firewall/rules/{existing['id']}", {
                        "filter": existing["filter"], "action": existing["action"], 
                        "description": rule_desc, "paused": False
                    })
                    if res and res.get("success"):
                        self.log("✓ Regla de Firewall reactivada")
                        log_firewall_rule(
                            rule_id=existing['id'],
                            rule_action="reactivated",
                            description=rule_desc,
                            zone_id=self.zone_id
                        )
                        return True
                else:
                    self.log("✓ Regla de Firewall ya existe y está activa")
                    return True
        
        # Crear nueva regla
        res = self.request("POST", f"zones/{self.zone_id}/firewall/rules", 
                          [{"filter": {"expression": expr}, "paused": False, "action": "block", "description": rule_desc}])
        
        if res and res.get("success"):
            rule_id = res["result"][0]["id"] if res.get("result") else "unknown"
            self.log("✓ Regla de Firewall creada")
            log_firewall_rule(
                rule_id=rule_id,
                rule_action="created",
                description=rule_desc,
                expression=expr,
                zone_id=self.zone_id
            )
            return True
        
        # Verificar limitación de plan
        if res and any(err.get("code") in [1003, 10000] for err in res.get("errors", [])):
            self.log("Nota: Firewall Rules no disponible en tu plan actual", "WARN")
            self.log("Restricción: Requiere plan Pro o superior", "WARN")
        else:
            log_api_error(
                "firewall_rule",
                "Error creando regla de firewall",
                "FirewallRuleError",
                zone_id=self.zone_id
            )
        
        return False
    
    def provision_domain(self, domain: str, origin_ip: str, zone_name: str) -> Dict:
        """Ejecuta provisión completa de un dominio (optimizado)"""
        self.log("=== INICIANDO PROVISIÓN DE SEGURIDAD PERIMETRAL ===")
        
        # Validar dominio
        if not validate_domain_in_zone(domain, zone_name):
            self.log(f"ERROR: El dominio '{domain}' no pertenece a la zona '{zone_name}'", "ERROR")
            log_protection_request(
                domain=domain,
                origin_ip=origin_ip,
                status="failed",
                error="Dominio no válido para esta zona",
                zone_name=zone_name
            )
            return {"success": False, "error": f"Dominio no válido para esta zona. Use '{zone_name}' o subdominios.", "logs": self.logs}
        
        self.log(f"✓ Dominio válido para zona '{zone_name}'")
        
        # Configuración de operaciones (lista optimizada)
        ops_config = [
            ("dns_proxy", lambda: self.configure_dns_proxy(domain, origin_ip), "[1/5] Configurando DNS Proxy", True),
            ("ssl_strict", lambda: self.configure_setting("ssl", "strict", "Modo SSL Full (Strict)"), "[2/5] Configurando SSL/TLS", False),
            ("https_redirect", lambda: self.configure_setting("always_use_https", "on", "Redirección HTTPS"), "[3/5] Configurando redirección HTTPS", False),
            ("waf", lambda: self.configure_setting("waf", "on", "WAF"), "[4/5] Configurando WAF", False),
            ("security_level", lambda: self.configure_setting("security_level", "high", "Security Level"), "[4/5] Configurando Security Level", False),
            ("firewall_rules", lambda: self.create_firewall_rule(), "[5/5] Configurando reglas de firewall", False)
        ]
        
        # Ejecutar operaciones
        operations = {}
        for key, func, msg, is_critical in ops_config:
            try:
                self.log(msg)
                operations[key] = func()
            except Exception as e:
                self.log(f"Error en {key}: {str(e)}", "WARN")
                operations[key] = False
        
        # Evaluar resultado (optimizado)
        if not operations.get("dns_proxy", False):
            self.log("=== PROVISIÓN FALLIDA: Operaciones críticas no completadas ===", "ERROR")
            log_protection_request(
                domain=domain,
                origin_ip=origin_ip,
                status="failed",
                error="No se pudo configurar DNS Proxy",
                operations=operations,
                zone_name=zone_name
            )
            return {"success": False, "error": "No se pudo configurar DNS Proxy (operación crítica)", "operations": operations, "logs": self.logs}
        
        # Determinar estado basado en operaciones importantes
        important_count = sum(operations.get(k, False) for k in ["ssl_strict", "https_redirect", "waf", "security_level"])
        status = "complete" if important_count >= 3 else "partial" if important_count > 0 else "minimal"
        
        self.log(f"=== PROVISIÓN COMPLETADA {'EXITOSAMENTE' if status == 'complete' else f'PARCIALMENTE ({important_count}/4)' if status == 'partial' else 'CON ADVERTENCIAS'} ===", 
                "INFO" if status == "complete" else "WARN")
        
        # Log de auditoría final
        log_protection_request(
            domain=domain,
            origin_ip=origin_ip,
            status=status,
            operations=operations,
            zone_name=zone_name,
            important_count=important_count
        )
        
        return {"success": True, "status": status, "operations": operations, "logs": self.logs}


# ===============================
# Handler de Vercel
# ===============================
class handler(BaseHTTPRequestHandler):
    """Handler para Vercel Serverless Function"""
    
    def _send_json(self, data: Dict, status_code: int = 200):
        """Envía respuesta JSON"""
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
        self.wfile.write(json.dumps(data, ensure_ascii=False).encode('utf-8'))
    
    def do_OPTIONS(self):
        """Maneja preflight CORS"""
        self._send_json({"message": "OK"}, 200)
    
    def do_GET(self):
        """Health check"""
        self._send_json({
            "status": "ok",
            "message": "API funcionando correctamente",
            "has_turnstile_key": bool(Config.TURNSTILE_SECRET_KEY),
            "has_cloudflare_config": bool(Config.CF_API_TOKEN and Config.CF_ZONE_ID)
        }, 200)
    
    def do_POST(self):
        """Procesa solicitud de protección"""
        try:
            # Verificar si el servicio está habilitado
            if not is_service_enabled():
                self._send_json({
                    "status": "error",
                    "message": "El servicio está deshabilitado temporalmente",
                    "service_disabled": True
                }, 503)
                return
            
            # Leer y parsear body
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length)
            
            try:
                data = json.loads(body.decode('utf-8'))
            except json.JSONDecodeError as e:
                self._send_json({"status": "error", "message": f"Error parseando JSON: {str(e)}"}, 400)
                return
            
            # Validar token de Turnstile
            token = data.get("turnstileToken")
            if not token:
                self._send_json({"status": "error", "message": "Falta el token de seguridad (Turnstile)"}, 400)
                return
            
            client_ip = self.headers.get("X-Forwarded-For", "").split(",")[0].strip()
            ok, err = validate_turnstile(token, client_ip)
            
            if not ok:
                status_code = 500 if "TURNSTILE_SECRET_KEY" in (err or "") else 403
                self._send_json({"status": "error", "message": err or "Verificación de seguridad fallida"}, status_code)
                return
            
            # Obtener y validar URLs
            urls = data.get("urls", [])
            if not urls:
                self._send_json({"status": "error", "message": "No se proporcionaron URLs"}, 400)
                return
            
            for url in urls:
                if not validate_fqdn(url):
                    self._send_json({"status": "error", "message": f"URL inválida: {url}"}, 400)
                    return
            
            # Verificar configuración de Cloudflare
            if not Config.CF_API_TOKEN or not Config.CF_ZONE_ID:
                # Modo simulación
                self._send_json({
                    "status": "ok",
                    "message": "Simulación completada - Configure credenciales de Cloudflare",
                    "sitios": [{
                        "dominio": url,
                        "estado": "Simulación - Configure Cloudflare credentials",
                        "nameservers": ["Configure CF_API_TOKEN and CF_ZONE_ID"]
                    } for url in urls],
                    "simulation_mode": True
                }, 200)
                return
            
            # Procesar URLs con protección REAL
            client = CloudflareClient(Config.CF_API_TOKEN, Config.CF_ZONE_ID)
            
            # Obtener información de zona
            zone_info = client.get_zone_info()
            if not zone_info:
                self._send_json({
                    "status": "error",
                    "message": "No se pudo obtener información de la zona",
                    "logs": client.logs
                }, 500)
                return
            
            zone_name = zone_info["name"]
            nameservers = zone_info["nameservers"]
            
            # Procesar cada dominio
            sitios = []
            for url in urls:
                # Resolver IP
                origin_ip, error = resolve_domain_ip(url)
                if error:
                    client.log(error, "ERROR")
                    sitios.append({
                        "dominio": url,
                        "estado": f"Error: {error}",
                        "nameservers": []
                    })
                    continue
                
                client.log(f"✓ Resuelto {url} -> {origin_ip}")
                
                # Provisionar
                result = client.provision_domain(url, origin_ip, zone_name)
                
                if result.get("success"):
                    sitios.append({
                        "dominio": url,
                        "estado": "Protección perimetral configurada",
                        "nameservers": nameservers,
                        "origin_ip": origin_ip
                    })
                else:
                    sitios.append({
                        "dominio": url,
                        "estado": f"Error: {result.get('error', 'Unknown')}",
                        "nameservers": [],
                        "origin_ip": origin_ip
                    })
            
            # Respuesta exitosa
            self._send_json({
                "status": "ok",
                "message": "Protección perimetral configurada exitosamente",
                "urls": urls,
                "sitios": sitios,
                "logs": client.logs,
                "progress": 100,
                "nameservers": nameservers,
                "simulation_mode": False
            }, 200)
        
        except Exception as e:
            self._send_json({
                "status": "error",
                "message": f"Error interno del servidor: {str(e)}",
                "type": type(e).__name__
            }, 500)
