"""
Utilidades compartidas para las APIs
"""
import json
import urllib.request
import urllib.error
import re
import socket
from typing import Dict, Any, Optional, Tuple
from api.config import CF_API_BASE_URL, get_headers, API_TIMEOUT, TURNSTILE_VERIFY_URL, TURNSTILE_SECRET_KEY


def make_cloudflare_request(method: str, endpoint: str, data: Optional[Dict] = None) -> Optional[Dict]:
    """
    Realiza una petición a la API de Cloudflare
    
    Args:
        method: Método HTTP (GET, POST, PUT, PATCH, DELETE)
        endpoint: Endpoint de la API (sin base URL)
        data: Datos a enviar (opcional)
    
    Returns:
        Respuesta JSON o None si hay error
    """
    url = f"{CF_API_BASE_URL}/{endpoint}"
    headers = get_headers()
    
    try:
        data_encoded = json.dumps(data).encode('utf-8') if data else None
        req = urllib.request.Request(url, data=data_encoded, headers=headers, method=method)
        
        with urllib.request.urlopen(req, timeout=API_TIMEOUT) as response:
            return json.loads(response.read().decode('utf-8'))
    
    except urllib.error.HTTPError as e:
        error_body = e.read().decode('utf-8') if e.fp else ""
        try:
            error_json = json.loads(error_body)
            return error_json
        except:
            return {
                "success": False,
                "errors": [{"message": f"HTTP {e.code}: {e.reason}"}]
            }
    
    except urllib.error.URLError as e:
        return {
            "success": False,
            "errors": [{"message": f"Error de conexión: {str(e.reason)}"}]
        }
    
    except Exception as e:
        return {
            "success": False,
            "errors": [{"message": f"Error inesperado: {str(e)}"}]
        }


def validate_turnstile(token: str, remote_ip: Optional[str] = None) -> Tuple[bool, Optional[str]]:
    """
    Valida un token de Cloudflare Turnstile
    
    Args:
        token: Token de Turnstile
        remote_ip: IP del cliente (opcional)
    
    Returns:
        Tupla (éxito, mensaje_error)
    """
    if not TURNSTILE_SECRET_KEY:
        return False, "TURNSTILE_SECRET_KEY no está configurada"
    
    data = {
        "secret": TURNSTILE_SECRET_KEY,
        "response": token
    }
    
    if remote_ip:
        data["remoteip"] = remote_ip
    
    try:
        data_encoded = urllib.parse.urlencode(data).encode('utf-8')
        req = urllib.request.Request(TURNSTILE_VERIFY_URL, data=data_encoded, method='POST')
        
        with urllib.request.urlopen(req, timeout=10) as response:
            result = json.loads(response.read().decode('utf-8'))
            
            if result.get("success"):
                return True, None
            
            error_codes = result.get("error-codes", result.get("error_codes", []))
            msg = "Verificación Turnstile fallida"
            if error_codes:
                msg += f". Códigos: {', '.join(error_codes)}"
            
            return False, msg
    
    except Exception as e:
        return False, f"Error al validar Turnstile: {str(e)}"


def validate_domain(domain: str) -> bool:
    """
    Valida que un dominio tenga formato DNS válido
    
    Args:
        domain: Dominio a validar
    
    Returns:
        True si es válido, False si no
    """
    pattern = r"^(?=.{1,253}$)(?!-)([A-Za-z0-9-]{1,63}(?<!-)\.)+[A-Za-z]{2,63}$"
    return bool(re.match(pattern, domain))


def validate_url(url: str) -> Tuple[bool, Optional[str], Optional[str]]:
    """
    Valida y extrae el dominio de una URL
    
    Args:
        url: URL a validar
    
    Returns:
        Tupla (válido, dominio, mensaje_error)
    """
    if not url or not isinstance(url, str):
        return False, None, "URL vacía o inválida"
    
    # Rechazar URLs con esquemas (http://, https://, etc.)
    if "://" in url:
        return False, None, "No se permiten esquemas (http://, https://). Use solo el dominio FQDN"
    
    # Rechazar URLs con rutas
    if "/" in url:
        return False, None, "No se permiten rutas. Use solo el dominio FQDN"
    
    domain = url.strip()
    
    if not domain:
        return False, None, "Dominio vacío"
    
    # Verificar si es una dirección IP
    ip_pattern = r"^(\d{1,3}\.){3}\d{1,3}$"
    if re.match(ip_pattern, domain):
        return False, None, "No se permiten direcciones IP. Use un dominio FQDN"
    
    if not validate_domain(domain):
        return False, None, f"Formato de dominio inválido: {domain}"
    
    return True, domain, None


def resolve_domain_ip(domain: str) -> Optional[str]:
    """
    Resuelve la IP de un dominio
    
    Args:
        domain: Dominio a resolver
    
    Returns:
        IP del dominio o None si no se puede resolver
    """
    try:
        return socket.gethostbyname(domain)
    except socket.gaierror:
        return None


def format_log(message: str, level: str = "INFO") -> str:
    """
    Formatea un mensaje de log
    
    Args:
        message: Mensaje a formatear
        level: Nivel del log (INFO, WARN, ERROR, SUCCESS)
    
    Returns:
        Mensaje formateado
    """
    icons = {
        "INFO": "ℹ️",
        "WARN": "⚠️",
        "ERROR": "❌",
        "SUCCESS": "✅"
    }
    
    icon = icons.get(level, "•")
    return f"{icon} [{level}] {message}"


def create_response(status: str, message: str, data: Optional[Dict] = None, status_code: int = 200) -> Tuple[Dict, int]:
    """
    Crea una respuesta HTTP estandarizada
    
    Args:
        status: Estado de la respuesta (ok, error)
        message: Mensaje descriptivo
        data: Datos adicionales (opcional)
        status_code: Código HTTP
    
    Returns:
        Tupla (respuesta_json, código_http)
    """
    response = {
        "status": status,
        "message": message
    }
    
    if data:
        response.update(data)
    
    return response, status_code


def get_zone_info(zone_id: str) -> Optional[Dict]:
    """
    Obtiene información de una zona de Cloudflare
    
    Args:
        zone_id: ID de la zona
    
    Returns:
        Información de la zona o None si hay error
    """
    return make_cloudflare_request("GET", f"zones/{zone_id}")


def check_domain_in_zone(domain: str, zone_name: str) -> bool:
    """
    Verifica si un dominio pertenece a una zona
    
    Args:
        domain: Dominio a verificar
        zone_name: Nombre de la zona
    
    Returns:
        True si pertenece, False si no
    """
    return domain == zone_name or domain.endswith(f".{zone_name}")
