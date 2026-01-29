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
    from utils import get_cors_headers
    CORS_AVAILABLE = True
except ImportError:
    CORS_AVAILABLE = False
    def get_cors_headers(origin):
        allowed_origin = "null"
        return {
            "Access-Control-Allow-Origin": allowed_origin,
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
            "Vary": "Origin",
        }

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

try:
    from config import (
        CF_API_TOKEN as CONFIG_CF_API_TOKEN,
        CF_ZONE_ID as CONFIG_CF_ZONE_ID,
        TURNSTILE_SECRET_KEY as CONFIG_TURNSTILE_SECRET_KEY,
        TURNSTILE_VERIFY_URL as CONFIG_TURNSTILE_VERIFY_URL,
        API_TIMEOUT as CONFIG_API_TIMEOUT,
        CF_API_BASE_URL as CONFIG_CF_API_BASE_URL,
    )
    CONFIG_AVAILABLE = True
except ImportError:
    CONFIG_AVAILABLE = False
    CONFIG_CF_API_TOKEN = os.getenv("CF_API_TOKEN", "")
    CONFIG_CF_ZONE_ID = os.getenv("CF_ZONE_ID", "")
    CONFIG_TURNSTILE_SECRET_KEY = os.getenv("TURNSTILE_SECRET_KEY", "")
    CONFIG_TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"
    CONFIG_API_TIMEOUT = 30
    CONFIG_CF_API_BASE_URL = "https://api.cloudflare.com/client/v4"

try:
    from exceptions import (
        BaseAPIError,
        ValidationError,
        AuthenticationError,
        CloudflareAPIError,
        DNSError,
        DNSRecordExistsError,
        NetworkError,
        TimeoutError,
        ServiceDisabledError,
        handle_cloudflare_error,
        get_user_friendly_message
    )
    EXCEPTIONS_AVAILABLE = True
except ImportError:
    EXCEPTIONS_AVAILABLE = False
    # Fallback sin excepciones tipadas
    class BaseAPIError(Exception):
        status_code = 500
        error_category = "unknown"
        def to_dict(self):
            return {"error_type": "BaseAPIError", "message": str(self)}
    ValidationError = BaseAPIError
    AuthenticationError = BaseAPIError
    CloudflareAPIError = BaseAPIError
    DNSError = BaseAPIError
    DNSRecordExistsError = BaseAPIError
    NetworkError = BaseAPIError
    TimeoutError = BaseAPIError
    ServiceDisabledError = BaseAPIError
    handle_cloudflare_error = lambda *args, **kwargs: CloudflareAPIError("Error de Cloudflare")
    get_user_friendly_message = lambda e: str(e)


# ===============================
# Configuración
# ===============================
class Config:
    """Configuración centralizada"""
    TURNSTILE_SECRET_KEY = CONFIG_TURNSTILE_SECRET_KEY
    CF_API_TOKEN = CONFIG_CF_API_TOKEN
    CF_ZONE_ID = CONFIG_CF_ZONE_ID
    API_TIMEOUT = CONFIG_API_TIMEOUT
    TURNSTILE_VERIFY_URL = CONFIG_TURNSTILE_VERIFY_URL
    CF_API_BASE_URL = CONFIG_CF_API_BASE_URL
    
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
    """
    Valida formato FQDN (optimizado con patrones precompilados)
    
    IMPORTANTE: Solo acepta dominios FQDN puros, sin esquemas, rutas, puertos, etc.
    """
    if not domain or not isinstance(domain, str):
        raise ValidationError("Dominio vacío o inválido", field="domain", value=domain)
    
    # Rechazar esquemas
    if "://" in domain:
        raise ValidationError("No se permiten esquemas (http://, https://). Use solo el dominio FQDN", field="domain", value=domain)
    
    # Rechazar rutas
    if "/" in domain:
        raise ValidationError("No se permiten rutas. Use solo el dominio FQDN", field="domain", value=domain)
    
    # Rechazar parámetros
    if "?" in domain or "&" in domain:
        raise ValidationError("No se permiten parámetros. Use solo el dominio FQDN", field="domain", value=domain)
    
    # Rechazar fragmentos
    if "#" in domain:
        raise ValidationError("No se permiten fragmentos. Use solo el dominio FQDN", field="domain", value=domain)
    
    # Rechazar puertos
    if ":" in domain:
        raise ValidationError("No se permiten puertos. Use solo el dominio FQDN", field="domain", value=domain)
    
    # Rechazar credenciales
    if "@" in domain:
        raise ValidationError("No se permiten credenciales. Use solo el dominio FQDN", field="domain", value=domain)
    
    # Rechazar espacios
    if " " in domain:
        raise ValidationError("No se permiten espacios en el dominio", field="domain", value=domain)
    
    # Verificar si es IP
    if Config.IP_PATTERN.match(domain):
        raise ValidationError("No se permiten direcciones IP, solo dominios FQDN", field="domain", value=domain)
    
    # Validar formato FQDN
    if not Config.FQDN_PATTERN.match(domain):
        raise ValidationError("El dominio no cumple con el formato FQDN válido", field="domain", value=domain)
    
    return True


def validate_domain_in_zone(domain: str, zone_name: str) -> bool:
    """Valida que el dominio pertenezca a la zona"""
    if not (domain == zone_name or domain.endswith(f".{zone_name}")):
        raise ValidationError(
            f"El dominio '{domain}' no pertenece a la zona '{zone_name}'",
            field="domain",
            domain=domain,
            zone_name=zone_name
        )
    return True


def resolve_domain_ip(domain: str) -> str:
    """Resuelve la IP del dominio"""
    try:
        return socket.gethostbyname(domain)
    except socket.gaierror as e:
        raise DNSError(f"No se pudo resolver el dominio {domain}", domain=domain, reason=str(e))
    except Exception as e:
        raise NetworkError(f"Error obteniendo IP del dominio: {str(e)}", endpoint=domain)


def validate_turnstile(token: str, remote_ip: Optional[str] = None) -> bool:
    """Valida token de Turnstile"""
    if not Config.TURNSTILE_SECRET_KEY:
        log_api_error("turnstile", "TURNSTILE_SECRET_KEY no configurada", "ConfigError")
        raise AuthenticationError(
            "TURNSTILE_SECRET_KEY no está configurada",
            reason="missing_config"
        )
    
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
            return True
        
        codes = result.get("error-codes") or result.get("error_codes") or []
        msg = "Verificación Turnstile fallida"
        if codes:
            msg += f". Códigos: {', '.join(codes)}"
        
        log_turnstile_verification(success=False, remote_ip=remote_ip, error_codes=codes)
        raise AuthenticationError(msg, reason="turnstile_failed", error_codes=codes, remote_ip=remote_ip)
    
    except AuthenticationError:
        raise
    except urllib.error.URLError as e:
        error_msg = f"Error conectando con Turnstile: {str(e.reason)}"
        log_api_error("turnstile", error_msg, "URLError", remote_ip=remote_ip)
        raise NetworkError(error_msg, endpoint=Config.TURNSTILE_VERIFY_URL)
    except Exception as e:
        error_msg = f"Error conectando con Turnstile: {str(e)}"
        log_api_error("turnstile", error_msg, type(e).__name__, remote_ip=remote_ip)
        raise NetworkError(error_msg, endpoint=Config.TURNSTILE_VERIFY_URL)


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
        """Realiza petición HTTP a Cloudflare API (optimizado con excepciones tipadas)"""
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
            error_body = None
            try:
                error_body = json.loads(err.read().decode('utf-8'))
            except:
                pass
            
            # Usar handle_cloudflare_error para convertir a excepción tipada
            if error_body and EXCEPTIONS_AVAILABLE:
                cf_error = handle_cloudflare_error(error_body, endpoint)
                
                # Tolerancia a fallos: detectar errores específicos
                if isinstance(cf_error, DNSRecordExistsError):
                    self.log("⚠️ Registro DNS ya existe, continuando (idempotente)", "WARN")
                    if LOGGING_AVAILABLE:
                        protection_logger.info(
                            "Registro DNS ya existe - operación idempotente",
                            error_code=81058,
                            endpoint=endpoint,
                            method=method
                        )
                    return {"success": True, "idempotent": True}
                
                # Loggear error
                self.log(f"Error Cloudflare: {cf_error.message}", "ERROR")
                if LOGGING_AVAILABLE:
                    log_api_error(
                        endpoint,
                        cf_error.message,
                        cf_error.__class__.__name__,
                        status_code=err.code,
                        error_body=error_body
                    )
                
                # No lanzar excepción, retornar None para tolerancia a fallos
                return None
            
            # Fallback sin excepciones tipadas
            self.log(f"Error HTTP {err.code}: {err.reason}", "ERROR")
            if error_body:
                self.log(f"Detalle: {json.dumps(error_body)}", "ERROR")
                if LOGGING_AVAILABLE:
                    log_api_error(
                        endpoint,
                        f"HTTP {err.code}: {err.reason}",
                        "HTTPError",
                        status_code=err.code,
                        error_body=error_body
                    )
            
            if err.code in Config.ERROR_HINTS:
                self.log(Config.ERROR_HINTS[err.code], "WARN")
            
            return None
        
        except urllib.error.URLError as e:
            self.log(f"Error de conexión: {str(e.reason)}", "ERROR")
            if LOGGING_AVAILABLE:
                log_api_error(endpoint, f"Conexión: {str(e.reason)}", "URLError")
            if EXCEPTIONS_AVAILABLE:
                # No lanzar, retornar None para tolerancia a fallos
                pass
            return None
        
        except socket.timeout:
            self.log(f"Timeout en request a {endpoint}", "ERROR")
            if LOGGING_AVAILABLE:
                log_api_error(endpoint, "Timeout", "TimeoutError", timeout=Config.API_TIMEOUT)
            return None
        
        except Exception as e:
            self.log(f"Error en request: {str(e)}", "ERROR")
            if LOGGING_AVAILABLE:
                log_api_error(endpoint, str(e), type(e).__name__)
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
    
    def validate_domain(self, domain: str, zone_name: str) -> Tuple[bool, Optional[str]]:
        """
        PASO 1: Validar dominio
        Controlador de flujo: Validación inicial
        """
        self.log("[PASO 1/5] Validando dominio...")
        
        try:
            validate_domain_in_zone(domain, zone_name)
            self.log(f"✓ Dominio válido para zona '{zone_name}'")
            return True, None
        except ValidationError as e:
            self.log(f"✗ ERROR: {e.message}", "ERROR")
            return False, e.message
    
    def verify_dns_resolution(self, domain: str) -> Tuple[bool, Optional[str]]:
        """
        PASO 2: Verificar resolución DNS
        Controlador de flujo: Verificación de DNS
        """
        self.log("[PASO 2/5] Verificando resolución DNS...")
        
        try:
            # Verificar que el dominio resuelve
            ip, error = resolve_domain_ip(domain)
            if error:
                self.log(f"⚠️ Advertencia DNS: {error}", "WARN")
                return True, None  # No crítico, continuar
            
            self.log(f"✓ DNS resuelve correctamente: {domain} -> {ip}")
            return True, None
        except Exception as e:
            self.log(f"⚠️ Error verificando DNS: {str(e)}", "WARN")
            return True, None  # No crítico, continuar
    
    def configure_dns_zone(self, domain: str, origin_ip: str) -> Tuple[bool, Optional[str]]:
        """
        PASO 3: Configurar zona DNS
        Controlador de flujo: Configuración DNS crítica
        """
        self.log("[PASO 3/5] Configurando zona DNS...")
        
        success = self.configure_dns_proxy(domain, origin_ip)
        
        if not success:
            error = "No se pudo configurar DNS Proxy (operación crítica)"
            self.log(f"✗ {error}", "ERROR")
            return False, error
        
        self.log("✓ Zona DNS configurada exitosamente")
        return True, None
    
    def apply_security_settings(self) -> Dict[str, bool]:
        """
        PASO 4: Aplicar configuraciones de seguridad
        Controlador de flujo: Configuraciones de seguridad
        """
        self.log("[PASO 4/5] Aplicando configuraciones de seguridad...")
        
        security_ops = {
            "ssl_strict": ("ssl", "strict", "Modo SSL Full (Strict)"),
            "https_redirect": ("always_use_https", "on", "Redirección HTTPS"),
            "waf": ("waf", "on", "WAF"),
            "security_level": ("security_level", "high", "Security Level")
        }
        
        results = {}
        for key, (setting, value, label) in security_ops.items():
            try:
                self.log(f"  → Configurando {label}...")
                results[key] = self.configure_setting(setting, value, label)
            except Exception as e:
                self.log(f"  ✗ Error en {label}: {str(e)}", "WARN")
                results[key] = False
        
        success_count = sum(results.values())
        self.log(f"✓ Configuraciones de seguridad aplicadas: {success_count}/{len(results)}")
        
        return results
    
    def apply_firewall_rules(self) -> Tuple[bool, Optional[str]]:
        """
        PASO 5: Aplicar reglas de firewall
        Controlador de flujo: Reglas de firewall
        """
        self.log("[PASO 5/5] Aplicando reglas de firewall...")
        
        try:
            success = self.create_firewall_rule()
            
            if success:
                self.log("✓ Reglas de firewall aplicadas")
            else:
                self.log("⚠️ No se pudieron aplicar reglas de firewall (no crítico)", "WARN")
            
            return success, None
        except Exception as e:
            self.log(f"⚠️ Error aplicando firewall: {str(e)}", "WARN")
            return False, None  # No crítico
    
    def provision_domain(self, domain: str, origin_ip: str, zone_name: str) -> Dict:
        """
        CONTROLADOR CENTRAL DE FLUJO
        Orquesta el proceso completo de provisión en pasos claros
        
        Flujo:
        1. Validar dominio
        2. Verificar DNS
        3. Configurar zona DNS (crítico)
        4. Aplicar seguridad
        5. Aplicar firewall
        """
        self.log("=" * 60)
        self.log("=== CONTROLADOR CENTRAL: PROVISIÓN DE SEGURIDAD ===")
        self.log("=" * 60)
        
        # PASO 1: Validar dominio
        valid, error = self.validate_domain(domain, zone_name)
        if not valid:
            log_protection_request(
                domain=domain,
                origin_ip=origin_ip,
                status="failed",
                error=error,
                zone_name=zone_name,
                step="validation"
            )
            return {"success": False, "error": error, "logs": self.logs, "step_failed": "validation"}
        
        # PASO 2: Verificar DNS
        dns_ok, dns_error = self.verify_dns_resolution(domain)
        # Continuar incluso si falla (no crítico)
        
        # PASO 3: Configurar zona DNS (CRÍTICO)
        dns_configured, dns_error = self.configure_dns_zone(domain, origin_ip)
        if not dns_configured:
            log_protection_request(
                domain=domain,
                origin_ip=origin_ip,
                status="failed",
                error=dns_error,
                zone_name=zone_name,
                step="dns_configuration"
            )
            return {"success": False, "error": dns_error, "logs": self.logs, "step_failed": "dns_configuration"}
        
        # PASO 4: Aplicar configuraciones de seguridad
        security_results = self.apply_security_settings()
        
        # PASO 5: Aplicar reglas de firewall
        firewall_ok, firewall_error = self.apply_firewall_rules()
        
        # Consolidar resultados
        operations = {
            "dns_proxy": dns_configured,
            "firewall_rules": firewall_ok,
            **security_results
        }
        
        # Evaluar resultado final
        important_count = sum(security_results.values())
        status = "complete" if important_count >= 3 else "partial" if important_count > 0 else "minimal"
        
        self.log("=" * 60)
        self.log(f"=== PROVISIÓN COMPLETADA: {status.upper()} ===")
        self.log(f"    DNS Configurado: {'✓' if dns_configured else '✗'}")
        self.log(f"    Seguridad: {important_count}/4 configuraciones")
        self.log(f"    Firewall: {'✓' if firewall_ok else '⚠️'}")
        self.log("=" * 60)
        
        # Log de auditoría final
        log_protection_request(
            domain=domain,
            origin_ip=origin_ip,
            status=status,
            operations=operations,
            zone_name=zone_name,
            important_count=important_count,
            flow_completed=True
        )
        
        return {
            "success": True,
            "status": status,
            "operations": operations,
            "logs": self.logs,
            "flow": {
                "validation": "passed",
                "dns_verification": "passed" if dns_ok else "warning",
                "dns_configuration": "passed",
                "security_settings": f"{important_count}/4",
                "firewall_rules": "passed" if firewall_ok else "warning"
            }
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

    def _send_error(self, message: str, status_code: int, error_type: Optional[str] = None, error_category: Optional[str] = None, **extra):
        """Envía respuesta de error estandarizada"""
        payload = {
            "status": "error",
            "message": message,
        }
        if error_type:
            payload["error_type"] = error_type
        if error_category:
            payload["error_category"] = error_category
        payload.update(extra)
        self._send_json(payload, status_code)

    def _read_json(self) -> Tuple[Optional[Dict], Optional[str]]:
        """Lee y parsea el body JSON de la request"""
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length)
        try:
            return json.loads(body.decode('utf-8')), None
        except json.JSONDecodeError as e:
            return None, str(e)

    def _get_client_ip(self) -> str:
        """Obtiene IP del cliente desde headers"""
        return self.headers.get("X-Forwarded-For", "").split(",")[0].strip()
    
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
                if EXCEPTIONS_AVAILABLE:
                    error = ServiceDisabledError()
                    self._send_error(
                        error.message,
                        error.status_code,
                        error_type=error.__class__.__name__,
                        error_category=error.error_category,
                        service_disabled=True,
                    )
                else:
                    self._send_error(
                        "El servicio está deshabilitado temporalmente",
                        503,
                        service_disabled=True,
                    )
                return
            
            # Leer y parsear body
            data, parse_error = self._read_json()
            if parse_error:
                if EXCEPTIONS_AVAILABLE:
                    error = ValidationError(f"Error parseando JSON: {parse_error}", field="body")
                    self._send_error(
                        error.message,
                        error.status_code,
                        error_type=error.__class__.__name__,
                        error_category=error.error_category,
                    )
                else:
                    self._send_error(f"Error parseando JSON: {parse_error}", 400)
                return
            
            # Validar token de Turnstile
            token = data.get("turnstileToken")
            client_ip = self._get_client_ip()
            
            if not token:
                log_api_error(
                    "turnstile_validation",
                    "Token de Turnstile no proporcionado",
                    "MissingTokenError",
                    remote_ip=client_ip
                )
                if EXCEPTIONS_AVAILABLE:
                    error = AuthenticationError(
                        "Falta el token de seguridad (Turnstile)",
                        reason="missing_token"
                    )
                    self._send_error(
                        error.message,
                        error.status_code,
                        error_type=error.__class__.__name__,
                        error_category=error.error_category,
                        error_code="MISSING_TURNSTILE_TOKEN",
                    )
                else:
                    self._send_error(
                        "Falta el token de seguridad (Turnstile)",
                        400,
                        error_code="MISSING_TURNSTILE_TOKEN",
                    )
                return
            
            # Validar Turnstile con manejo de excepciones
            try:
                validate_turnstile(token, client_ip)
                
                # Log de verificación exitosa
                if LOGGING_AVAILABLE and protection_logger:
                    protection_logger.info(
                        "Turnstile verificado exitosamente",
                        remote_ip=client_ip,
                        verification="success"
                    )
            
            except AuthenticationError as e:
                # Determinar tipo de error
                if "TURNSTILE_SECRET_KEY" in e.message:
                    error_code = "TURNSTILE_NOT_CONFIGURED"
                    status_code = 500
                else:
                    error_code = "TURNSTILE_VERIFICATION_FAILED"
                    status_code = 403
                
                self._send_error(
                    e.message if EXCEPTIONS_AVAILABLE else "Verificación de seguridad fallida",
                    status_code,
                    error_type=e.__class__.__name__ if EXCEPTIONS_AVAILABLE else "AuthenticationError",
                    error_category=e.error_category if EXCEPTIONS_AVAILABLE else "user_error",
                    error_code=error_code,
                    detail="Por favor, recarga la página e intenta nuevamente",
                )
                return
            
            except NetworkError as e:
                self._send_error(
                    e.message if EXCEPTIONS_AVAILABLE else "Error de red al verificar seguridad",
                    503,
                    error_type=e.__class__.__name__ if EXCEPTIONS_AVAILABLE else "NetworkError",
                    error_category=e.error_category if EXCEPTIONS_AVAILABLE else "network_error",
                    error_code="TURNSTILE_NETWORK_ERROR",
                )
                return
            
            # Obtener y validar URLs
            urls = data.get("urls", [])
            if not urls:
                if EXCEPTIONS_AVAILABLE:
                    error = ValidationError("No se proporcionaron URLs", field="urls")
                    self._send_error(
                        error.message,
                        error.status_code,
                        error_type=error.__class__.__name__,
                        error_category=error.error_category,
                    )
                else:
                    self._send_error("No se proporcionaron URLs", 400)
                return
            
            # Validar cada URL
            try:
                for url in urls:
                    validate_fqdn(url)
            except ValidationError as e:
                self._send_error(
                    e.message if EXCEPTIONS_AVAILABLE else f"URL inválida: {url}",
                    400,
                    error_type=e.__class__.__name__ if EXCEPTIONS_AVAILABLE else "ValidationError",
                    error_category=e.error_category if EXCEPTIONS_AVAILABLE else "user_error",
                    invalid_url=e.details.get("value") if EXCEPTIONS_AVAILABLE else url,
                )
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
                    "error_type": "CloudflareAPIError",
                    "error_category": "cloudflare_error",
                    "logs": client.logs
                }, 500)
                return
            
            zone_name = zone_info["name"]
            nameservers = zone_info["nameservers"]
            
            # Procesar cada dominio
            sitios = []
            for url in urls:
                try:
                    # Resolver IP
                    origin_ip = resolve_domain_ip(url)
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
                
                except (DNSError, NetworkError) as e:
                    error_msg = e.message if EXCEPTIONS_AVAILABLE else str(e)
                    client.log(error_msg, "ERROR")
                    sitios.append({
                        "dominio": url,
                        "estado": f"Error: {error_msg}",
                        "error_type": e.__class__.__name__ if EXCEPTIONS_AVAILABLE else "Error",
                        "error_category": e.error_category if EXCEPTIONS_AVAILABLE else "unknown",
                        "nameservers": []
                    })
                    continue
            
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
        
        except BaseAPIError as e:
            # Capturar cualquier excepción tipada no manejada
            self._send_json({
                "status": "error",
                "message": get_user_friendly_message(e) if EXCEPTIONS_AVAILABLE else str(e),
                "error_type": e.__class__.__name__ if EXCEPTIONS_AVAILABLE else "Error",
                "error_category": e.error_category if EXCEPTIONS_AVAILABLE else "unknown",
                "technical_message": e.message if EXCEPTIONS_AVAILABLE else str(e)
            }, getattr(e, 'status_code', 500))
        
        except Exception as e:
            # Capturar excepciones no tipadas
            log_api_error("handler", str(e), type(e).__name__)
            self._send_json({
                "status": "error",
                "message": f"Error interno del servidor: {str(e)}",
                "error_type": type(e).__name__,
                "error_category": "internal_error"
            }, 500)
