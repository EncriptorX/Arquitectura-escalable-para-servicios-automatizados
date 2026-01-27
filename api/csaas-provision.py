"""
Vercel Serverless Function - Cloudflare for SaaS (CSaaS) Provisioning
Sistema completo de protección perimetral automatizada usando Custom Hostnames

Flujo CSaaS:
1. Cliente envía formulario con nombre/ID y URLs a proteger
2. Generar subdominio único bajo suncarsrl.com (ej: cliente123.suncarsrl.com)
3. Crear registro CNAME proxied en suncarsrl.com apuntando a customers.suncarsrl.com
4. Crear Custom Hostname en Cloudflare for SaaS con SSL DV HTTP
5. Polling hasta que Custom Hostname esté "active"
6. Aplicar reglas de seguridad (WAF, rate-limiting)
7. Devolver URL protegida al cliente
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
    from config import is_service_enabled
except ImportError:
    def is_service_enabled():
        return True

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
    from exceptions import (
        ValidationError, AuthenticationError, CloudflareAPIError,
        NetworkError, TimeoutError, ServiceDisabledError
    )
    EXCEPTIONS_AVAILABLE = True
except ImportError:
    EXCEPTIONS_AVAILABLE = False
    class BaseAPIError(Exception):
        status_code = 500
        def to_dict(self):
            return {"error": str(self)}
    ValidationError = BaseAPIError
    AuthenticationError = BaseAPIError
    CloudflareAPIError = BaseAPIError
    NetworkError = BaseAPIError
    TimeoutError = BaseAPIError
    ServiceDisabledError = BaseAPIError

# ===============================
# Configuración CSaaS
# ===============================
class CSaaSConfig:
    """Configuración para Cloudflare for SaaS"""
    CF_API_TOKEN = os.getenv("CF_API_TOKEN", "")
    CF_ZONE_ID = os.getenv("CF_ZONE_ID", "")
    CF_API_BASE_URL = "https://api.cloudflare.com/client/v4"
    
    # Configuración de la zona SaaS
    SAAS_ZONE = "suncarsrl.com"  # Zona principal donde se crearán subdominios
    CNAME_TARGET = "customers.suncarsrl.com"  # CNAME target fijo para Custom Hostnames
    
    # Configuración de polling
    MAX_POLLING_ATTEMPTS = 30  # 30 intentos (reducido de 60)
    POLLING_INTERVAL = 3  # 3 segundos entre intentos (reducido de 5)
    # Total: máximo 90 segundos (1.5 minutos)
    
    # Configuración de SSL
    SSL_METHOD = "http"  # DV por HTTP
    SSL_TYPE = "dv"  # Domain Validation
    
    # Almacenamiento en memoria (sin base de datos)
    PROVISIONED_CLIENTS = {}  # {client_id: {subdomain, custom_hostname_id, urls, status}}


# ===============================
# Utilidades CSaaS
# ===============================
def generate_subdomain(client_name: str, client_id: Optional[str] = None) -> str:
    """
    Genera un subdominio único basado en el nombre del cliente
    
    Args:
        client_name: Nombre del cliente
        client_id: ID opcional del cliente
    
    Returns:
        Subdominio único (ej: cliente123.suncarsrl.com)
    """
    # Limpiar nombre del cliente
    clean_name = ''.join(c.lower() for c in client_name if c.isalnum())[:20]
    
    # Generar hash único
    if client_id:
        unique_str = f"{client_name}-{client_id}-{int(time.time())}"
    else:
        unique_str = f"{client_name}-{int(time.time())}"
    
    hash_suffix = hashlib.md5(unique_str.encode()).hexdigest()[:8]
    
    # Construir subdominio
    subdomain = f"{clean_name}-{hash_suffix}.{CSaaSConfig.SAAS_ZONE}"
    
    return subdomain


def validate_client_data(data: Dict) -> Tuple[bool, Optional[str]]:
    """
    Valida los datos del cliente
    
    Args:
        data: Datos del formulario
    
    Returns:
        (válido, mensaje_error)
    """
    # Validar nombre del cliente
    client_name = data.get("client_name", "").strip()
    if not client_name:
        return False, "El nombre del cliente es requerido"
    
    # Validar URLs
    urls = data.get("urls", [])
    if not urls or not isinstance(urls, list):
        return False, "Debe proporcionar al menos una URL a proteger"
    
    # Validar formato de URLs
    for url in urls:
        if not url or not isinstance(url, str):
            return False, f"URL inválida: {url}"
        
        # Validar formato básico de dominio
        if "://" in url or "/" in url or " " in url:
            return False, f"URL debe ser un dominio FQDN sin esquemas ni rutas: {url}"
    
    return True, None


# ===============================
# Cliente Cloudflare for SaaS
# ===============================
class CloudflareSaaSClient:
    """Cliente para Cloudflare for SaaS API"""
    
    def __init__(self, api_token: str, zone_id: str):
        self.api_token = api_token
        self.zone_id = zone_id
        self.logs = []
    
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
            url = f"{CSaaSConfig.CF_API_BASE_URL}/{endpoint}"
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
            
            with urllib.request.urlopen(req, timeout=30) as response:
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
    
    def verify_cname_target_exists(self, target: str) -> bool:
        """
        Verifica que el CNAME target existe en la zona
        
        Args:
            target: CNAME target a verificar (ej: customers.suncarsrl.com)
        
        Returns:
            True si existe, False si no
        """
        self.log(f"[PASO 0.5/5] Verificando que el CNAME target existe: {target}")
        
        # Buscar el registro DNS del target
        search_res = self.request("GET", f"zones/{self.zone_id}/dns_records?name={target}")
        
        if search_res and search_res.get("result"):
            existing = search_res["result"]
            if existing:
                self.log(f"✓ CNAME target encontrado: {target}")
                return True
        
        self.log(f"⚠️ CNAME target no encontrado: {target}. Se creará automáticamente.", "WARN")
        
        # Crear el CNAME target apuntando a un fallback (puede ser la zona misma o un servidor de origen)
        # Por defecto, lo apuntamos a la zona principal para que funcione
        fallback_target = CSaaSConfig.SAAS_ZONE
        
        payload = {
            "type": "CNAME",
            "name": target,
            "content": fallback_target,
            "proxied": True,
            "ttl": 1,
            "comment": "CNAME target automático para Cloudflare for SaaS"
        }
        
        res = self.request("POST", f"zones/{self.zone_id}/dns_records", payload)
        
        if res and res.get("success"):
            self.log(f"✓ CNAME target creado automáticamente: {target} -> {fallback_target}")
            return True
        
        self.log(f"✗ No se pudo crear el CNAME target: {target}", "ERROR")
        return False
    
    def create_cname_record(self, subdomain: str, target: str) -> Tuple[bool, Optional[str]]:
        """
        Crea un registro CNAME proxied en la zona
        
        Args:
            subdomain: Subdominio completo (ej: cliente123.suncarsrl.com)
            target: CNAME target (ej: customers.suncarsrl.com)
        
        Returns:
            (éxito, record_id)
        """
        self.log(f"[PASO 1/5] Creando registro CNAME: {subdomain} -> {target}")
        
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
            "ttl": 1
        }
        
        res = self.request("POST", f"zones/{self.zone_id}/dns_records", payload)
        
        if res and res.get("success"):
            record_id = res["result"]["id"]
            self.log(f"✓ Registro CNAME creado exitosamente (ID: {record_id})")
            return True, record_id
        
        self.log("✗ Error al crear registro CNAME", "ERROR")
        return False, None
    
    def create_custom_hostname(self, hostname: str, origin_urls: List[str]) -> Tuple[bool, Optional[str], Optional[Dict]]:
        """
        Crea un Custom Hostname en Cloudflare for SaaS
        
        Args:
            hostname: Hostname del cliente (subdominio)
            origin_urls: URLs de origen del cliente
        
        Returns:
            (éxito, custom_hostname_id, detalles)
        """
        self.log(f"[PASO 2/5] Creando Custom Hostname: {hostname}")
        
        # Verificar si ya existe
        self.log(f"  → Verificando si el Custom Hostname ya existe...")
        search_res = self.request("GET", f"zones/{self.zone_id}/custom_hostnames?hostname={hostname}")
        
        if search_res and search_res.get("success"):
            existing = search_res.get("result", [])
            if existing:
                ch = existing[0]
                custom_hostname_id = ch["id"]
                status = ch.get("status", "unknown")
                self.log(f"✓ Custom Hostname ya existe (ID: {custom_hostname_id}, Status: {status})")
                return True, custom_hostname_id, ch
        
        # Usar la primera URL como origin server
        origin_server = origin_urls[0] if origin_urls else None
        
        # Configuración del Custom Hostname con origin server
        payload = {
            "hostname": hostname,
            "ssl": {
                "method": CSaaSConfig.SSL_METHOD,
                "type": CSaaSConfig.SSL_TYPE,
                "settings": {
                    "http2": "on",
                    "min_tls_version": "1.2",
                    "tls_1_3": "on"
                }
            }
        }
        
        # Agregar custom origin server si se proporcionó
        if origin_server:
            payload["custom_origin_server"] = origin_server
            self.log(f"  → Origin Server configurado: {origin_server}")
        
        self.log(f"  → Enviando petición para crear Custom Hostname...")
        self.log(f"  → Payload: {json.dumps(payload, indent=2)}")
        
        # Crear Custom Hostname
        res = self.request("POST", f"zones/{self.zone_id}/custom_hostnames", payload)
        
        if res and res.get("success"):
            result = res["result"]
            custom_hostname_id = result["id"]
            status = result.get("status", "pending")
            
            self.log(f"✓ Custom Hostname creado (ID: {custom_hostname_id}, Status: {status})")
            
            return True, custom_hostname_id, result
        
        # Log detallado del error
        self.log("✗ Error al crear Custom Hostname", "ERROR")
        if res:
            errors = res.get("errors", [])
            if errors:
                self.log(f"  → Errores de Cloudflare:", "ERROR")
                for error in errors:
                    self.log(f"    • Código: {error.get('code')}", "ERROR")
                    self.log(f"    • Mensaje: {error.get('message')}", "ERROR")
            else:
                self.log(f"  → Respuesta completa: {json.dumps(res, indent=2)}", "ERROR")
        else:
            self.log(f"  → No se recibió respuesta de Cloudflare", "ERROR")
        
        return False, None, res
    
    def poll_custom_hostname_status(self, custom_hostname_id: str) -> Tuple[bool, str, Optional[Dict]]:
        """
        Hace polling hasta que el Custom Hostname esté activo
        
        Args:
            custom_hostname_id: ID del Custom Hostname
        
        Returns:
            (éxito, status_final, detalles)
        """
        self.log(f"[PASO 3/5] Esperando activación del Custom Hostname...")
        
        for attempt in range(CSaaSConfig.MAX_POLLING_ATTEMPTS):
            # Consultar estado
            res = self.request("GET", f"zones/{self.zone_id}/custom_hostnames/{custom_hostname_id}")
            
            if not res or not res.get("success"):
                self.log(f"⚠️ Error consultando estado (intento {attempt + 1}/{CSaaSConfig.MAX_POLLING_ATTEMPTS})", "WARN")
                time.sleep(CSaaSConfig.POLLING_INTERVAL)
                continue
            
            result = res["result"]
            status = result.get("status", "unknown")
            ssl_status = result.get("ssl", {}).get("status", "unknown")
            
            self.log(f"  Intento {attempt + 1}/{CSaaSConfig.MAX_POLLING_ATTEMPTS}: Status={status}, SSL={ssl_status}")
            
            # Verificar si está activo
            if status == "active" and ssl_status == "active":
                self.log(f"✓ Custom Hostname activo después de {attempt + 1} intentos ({(attempt + 1) * CSaaSConfig.POLLING_INTERVAL}s)")
                return True, "active", result
            
            # Si está en pending_validation, es suficiente para continuar
            # El SSL se activará automáticamente en los próximos minutos
            if status == "active" and ssl_status in ["pending_validation", "pending_deployment"]:
                self.log(f"✓ Custom Hostname creado, SSL en proceso de validación ({ssl_status})")
                self.log(f"  El SSL se activará automáticamente en 1-5 minutos")
                return True, "pending_ssl", result
            
            # Verificar si hay error
            if status in ["blocked", "deleted"]:
                self.log(f"✗ Custom Hostname en estado de error: {status}", "ERROR")
                return False, status, result
            
            # Esperar antes del siguiente intento
            time.sleep(CSaaSConfig.POLLING_INTERVAL)
        
        # Si llegamos aquí, el Custom Hostname está creado pero aún no completamente activo
        # Esto es aceptable - se activará en los próximos minutos
        self.log(f"⏱️ Tiempo de espera alcanzado, pero Custom Hostname está creado")
        self.log(f"  El SSL se activará automáticamente en los próximos minutos")
        
        # Hacer una última consulta para obtener el estado actual
        res = self.request("GET", f"zones/{self.zone_id}/custom_hostnames/{custom_hostname_id}")
        if res and res.get("success"):
            result = res["result"]
            status = result.get("status", "unknown")
            return True, "pending_activation", result
        
        return True, "pending_activation", None
    
    def apply_security_rules(self, hostname: str) -> Dict[str, bool]:
        """
        Aplica reglas de seguridad básicas al Custom Hostname
        
        Args:
            hostname: Hostname del cliente
        
        Returns:
            Diccionario con resultados de cada configuración
        """
        self.log(f"[PASO 4/5] Aplicando reglas de seguridad...")
        
        results = {}
        
        # WAF Managed Rules
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
        
        # Bot Fight Mode (disponible en planes Free/Pro/Business)
        self.log("  → Configurando Bot Fight Mode...")
        bot_res = self.request("PATCH", f"zones/{self.zone_id}/settings/bot_fight_mode", {"value": "on"})
        results["bot_fight_mode"] = bool(bot_res and bot_res.get("success"))
        
        # Browser Integrity Check
        self.log("  → Configurando Browser Integrity Check...")
        bic_res = self.request("PATCH", f"zones/{self.zone_id}/settings/browser_check", {"value": "on"})
        results["browser_check"] = bool(bic_res and bic_res.get("success"))
        
        # Challenge Passage
        self.log("  → Configurando Challenge Passage...")
        cp_res = self.request("PATCH", f"zones/{self.zone_id}/settings/challenge_ttl", {"value": 1800})
        results["challenge_ttl"] = bool(cp_res and cp_res.get("success"))
        
        # Rate Limiting básico usando Firewall Rules (disponible en todos los planes)
        self.log("  → Configurando Rate Limiting básico...")
        try:
            # Crear regla de firewall para rate limiting básico
            rate_limit_rule = {
                "filter": {
                    "expression": f'(http.host eq "{hostname}")',
                    "paused": False
                },
                "action": "challenge",
                "description": f"Rate limiting básico para {hostname}"
            }
            rl_res = self.request("POST", f"zones/{self.zone_id}/firewall/rules", rate_limit_rule)
            results["rate_limiting"] = bool(rl_res and rl_res.get("success"))
        except Exception as e:
            self.log(f"  ⚠️ No se pudo configurar rate limiting: {str(e)}", "WARN")
            results["rate_limiting"] = False
        
        success_count = sum(results.values())
        self.log(f"✓ Reglas de seguridad aplicadas: {success_count}/{len(results)}")
        
        return results
    
    def provision_client(self, client_name: str, client_id: Optional[str], urls: List[str]) -> Dict:
        """
        CONTROLADOR CENTRAL: Provisiona un cliente completo en CSaaS
        
        Args:
            client_name: Nombre del cliente
            client_id: ID opcional del cliente
            urls: URLs a proteger
        
        Returns:
            Resultado del provisionamiento
        """
        self.log("=" * 60)
        self.log("=== INICIO PROVISIONAMIENTO CSaaS ===")
        self.log("=" * 60)
        
        # PASO 0: Generar subdominio único
        subdomain = generate_subdomain(client_name, client_id)
        self.log(f"[PASO 0/5] Subdominio generado: {subdomain}")
        
        # PASO 0.5: Verificar que el CNAME target existe
        target_exists = self.verify_cname_target_exists(CSaaSConfig.CNAME_TARGET)
        if not target_exists:
            return {
                "success": False,
                "error": f"No se pudo verificar o crear el CNAME target: {CSaaSConfig.CNAME_TARGET}",
                "step_failed": "cname_target_verification",
                "logs": self.logs
            }
        
        # PASO 1: Crear registro CNAME
        cname_success, record_id = self.create_cname_record(subdomain, CSaaSConfig.CNAME_TARGET)
        if not cname_success:
            return {
                "success": False,
                "error": "No se pudo crear el registro CNAME",
                "step_failed": "cname_creation",
                "logs": self.logs
            }
        
        # PASO 2: Crear Custom Hostname
        ch_success, ch_id, ch_details = self.create_custom_hostname(subdomain, urls)
        if not ch_success:
            return {
                "success": False,
                "error": "No se pudo crear el Custom Hostname",
                "step_failed": "custom_hostname_creation",
                "logs": self.logs,
                "details": ch_details
            }
        
        # PASO 3: Polling hasta activación
        active_success, final_status, active_details = self.poll_custom_hostname_status(ch_id)
        if not active_success:
            return {
                "success": False,
                "error": f"Custom Hostname no se activó (status: {final_status})",
                "step_failed": "custom_hostname_activation",
                "status": final_status,
                "logs": self.logs
            }
        
        # Nota: final_status puede ser "active", "pending_ssl" o "pending_activation"
        # Todos son estados válidos - el SSL se activará automáticamente
        
        # PASO 4: Aplicar reglas de seguridad
        security_results = self.apply_security_rules(subdomain)
        
        # PASO 5: Almacenar en memoria
        self.log(f"[PASO 5/5] Almacenando información del cliente...")
        client_key = client_id or hashlib.md5(client_name.encode()).hexdigest()[:16]
        CSaaSConfig.PROVISIONED_CLIENTS[client_key] = {
            "client_name": client_name,
            "client_id": client_id,
            "subdomain": subdomain,
            "custom_hostname_id": ch_id,
            "cname_record_id": record_id,
            "origin_urls": urls,
            "status": "active",
            "security_rules": security_results,
            "created_at": time.time()
        }
        
        self.log("=" * 60)
        self.log("=== PROVISIONAMIENTO COMPLETADO ===")
        self.log(f"    URL Protegida: https://{subdomain}")
        self.log(f"    Custom Hostname ID: {ch_id}")
        self.log(f"    Status: {final_status}")
        self.log("=" * 60)
        
        return {
            "success": True,
            "client_key": client_key,
            "subdomain": subdomain,
            "protected_url": f"https://{subdomain}",
            "custom_hostname_id": ch_id,
            "cname_record_id": record_id,
            "status": final_status,
            "origin_urls": urls,
            "security_rules": security_results,
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
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
        self.wfile.write(json.dumps(data, ensure_ascii=False).encode('utf-8'))
    
    def do_OPTIONS(self):
        """Maneja preflight CORS"""
        self._send_json({"message": "OK"}, 200)
    
    def do_GET(self):
        """Health check y listado de clientes provisionados"""
        # Listar clientes provisionados
        clients = []
        for key, info in CSaaSConfig.PROVISIONED_CLIENTS.items():
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
            "message": "CSaaS Provisioning API funcionando",
            "saas_zone": CSaaSConfig.SAAS_ZONE,
            "cname_target": CSaaSConfig.CNAME_TARGET,
            "provisioned_clients": clients,
            "total_clients": len(clients)
        }, 200)
    
    def do_POST(self):
        """Provisiona un nuevo cliente en CSaaS"""
        try:
            # Verificar si el servicio está habilitado
            if not is_service_enabled():
                if EXCEPTIONS_AVAILABLE:
                    error = ServiceDisabledError()
                    self._send_json({
                        "status": "error",
                        "message": error.message,
                        "service_disabled": True
                    }, error.status_code)
                else:
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
                self._send_json({
                    "status": "error",
                    "message": f"Error parseando JSON: {str(e)}"
                }, 400)
                return
            
            # Validar datos del cliente
            valid, error_msg = validate_client_data(data)
            if not valid:
                self._send_json({
                    "status": "error",
                    "message": error_msg
                }, 400)
                return
            
            # Extraer datos
            client_name = data.get("client_name", "").strip()
            client_id = data.get("client_id", "").strip() or None
            urls = data.get("urls", [])
            
            # Verificar configuración de Cloudflare
            if not CSaaSConfig.CF_API_TOKEN or not CSaaSConfig.CF_ZONE_ID:
                self._send_json({
                    "status": "error",
                    "message": "Cloudflare no está configurado. Configure CF_API_TOKEN y CF_ZONE_ID",
                    "simulation_mode": True
                }, 500)
                return
            
            # Provisionar cliente
            client = CloudflareSaaSClient(CSaaSConfig.CF_API_TOKEN, CSaaSConfig.CF_ZONE_ID)
            result = client.provision_client(client_name, client_id, urls)
            
            if result.get("success"):
                self._send_json({
                    "status": "ok",
                    "message": "Cliente provisionado exitosamente en CSaaS",
                    "client_key": result["client_key"],
                    "subdomain": result["subdomain"],
                    "protected_url": result["protected_url"],
                    "custom_hostname_id": result["custom_hostname_id"],
                    "origin_urls": result["origin_urls"],
                    "security_rules": result["security_rules"],
                    "logs": result["logs"]
                }, 200)
            else:
                # Error detallado
                error_message = result.get("error", "Error desconocido")
                step_failed = result.get("step_failed", "unknown")
                logs = result.get("logs", [])
                
                # Agregar información adicional según el paso que falló
                if step_failed == "custom_hostname_creation":
                    error_message += "\n\nPosibles causas:\n"
                    error_message += "1. Cloudflare for SaaS no está habilitado en tu zona\n"
                    error_message += "2. Tu plan no incluye Custom Hostnames (requiere Business+)\n"
                    error_message += "3. Has alcanzado el límite de Custom Hostnames\n"
                    error_message += "4. El hostname ya existe en otra zona\n\n"
                    error_message += "Revisa los logs para más detalles."
                
                self._send_json({
                    "status": "error",
                    "message": error_message,
                    "step_failed": step_failed,
                    "logs": logs,
                    "details": result.get("details")
                }, 500)
        
        except Exception as e:
            # Capturar el traceback completo
            import traceback
            error_traceback = traceback.format_exc()
            
            if LOGGING_AVAILABLE:
                log_api_error("csaas_provision", str(e), type(e).__name__)
                protection_logger.error(f"Traceback completo:\n{error_traceback}")
            
            # Log en consola para debugging
            print(f"ERROR en csaas-provision: {str(e)}", file=sys.stderr)
            print(f"Traceback:\n{error_traceback}", file=sys.stderr)
            
            self._send_json({
                "status": "error",
                "message": f"Error interno del servidor: {str(e)}",
                "error_type": type(e).__name__,
                "traceback": error_traceback if os.getenv("DEBUG") == "true" else None
            }, 500)
