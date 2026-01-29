"""
Vercel Serverless Function - Verificación de Delegación DNS
Permite al cliente verificar si su dominio ya fue delegado correctamente a Cloudflare
"""
from http.server import BaseHTTPRequestHandler
import json
import os
import socket
import urllib.request
import urllib.error
import sys

# Agregar el directorio api al path
sys.path.insert(0, os.path.dirname(__file__))

try:
    from utils import get_cors_headers, is_host_allowed
except ImportError:
    def get_cors_headers(origin):
        allowed_origin = "null"
        return {
            "Access-Control-Allow-Origin": allowed_origin,
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
            "Vary": "Origin",
        }
    def is_host_allowed(host: str) -> bool:
        allowed = {h.strip().lower() for h in os.getenv("ALLOWED_HOSTS", "").split(",") if h.strip()}
        normalized = (host or "").split(":")[0].strip().lower()
        vercel_url = os.getenv("VERCEL_URL", "").strip().lower()
        return bool(normalized and (normalized in allowed or (vercel_url and normalized == vercel_url)))

try:
    from config import CF_API_TOKEN, CF_ZONE_ID
    from utils import make_cloudflare_request
    CONFIG_AVAILABLE = True
except ImportError:
    CONFIG_AVAILABLE = False
    CF_API_TOKEN = os.getenv("CF_API_TOKEN", "")
    CF_ZONE_ID = os.getenv("CF_ZONE_ID", "")

    def make_cloudflare_request(method: str, endpoint: str, data=None):
        url = f"https://api.cloudflare.com/client/v4/{endpoint}"
        headers = {
            "Authorization": f"Bearer {CF_API_TOKEN}",
            "Content-Type": "application/json",
        }

        try:
            req = urllib.request.Request(url, headers=headers, method=method)
            with urllib.request.urlopen(req, timeout=10) as response:
                return json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            return {
                "success": False,
                "errors": [{"message": f"HTTP {e.code}: {e.reason}"}],
                "status_code": e.code,
            }
        except Exception as e:
            return {
                "success": False,
                "errors": [{"message": str(e)}],
                "status_code": None,
            }

try:
    import dns.resolver
    DNS_RESOLVER_AVAILABLE = True
except ImportError:
    DNS_RESOLVER_AVAILABLE = False

try:
    from logger import delegation_logger, log_delegation_check
    LOGGING_AVAILABLE = True
except ImportError:
    LOGGING_AVAILABLE = False
    delegation_logger = None
    log_delegation_check = lambda *args, **kwargs: None

try:
    from exceptions import (
        BaseAPIError,
        ValidationError,
        DNSError,
        DNSDelegationError,
        DNSResolutionError,
        NetworkError,
        get_user_friendly_message
    )
    EXCEPTIONS_AVAILABLE = True
except ImportError:
    EXCEPTIONS_AVAILABLE = False
    class BaseAPIError(Exception):
        status_code = 500
        error_category = "unknown"
        def to_dict(self):
            return {"error_type": "BaseAPIError", "message": str(self)}
    ValidationError = BaseAPIError
    DNSError = BaseAPIError
    DNSDelegationError = BaseAPIError
    DNSResolutionError = BaseAPIError
    NetworkError = BaseAPIError
    get_user_friendly_message = lambda e: str(e)


def _extract_error_message(result: dict, fallback: str) -> str:
    if not isinstance(result, dict):
        return fallback
    errors = result.get("errors") or []
    if errors and isinstance(errors, list) and isinstance(errors[0], dict):
        return errors[0].get("message", fallback)
    return result.get("error") or fallback

def verify_dns(domain, expected_ns):
    """
    Verifica si el dominio apunta a los nameservers esperados.
    Usa dns.resolver (dnspython) para verificación real.
    
    Args:
        domain: Dominio a verificar
        expected_ns: Lista de nameservers esperados
    
    Returns:
        tuple: (bool, list) - (está_delegado, nameservers_actuales)
    
    Raises:
        DNSResolutionError: Si el dominio no existe o no tiene NS
        NetworkError: Si hay timeout o error de red
    """
    try:
        import dns.resolver
        
        # Normalizar nameservers esperados
        expected_ns_norm = [ns.lower().rstrip('.') for ns in expected_ns]
        
        # Resolver NS records del dominio
        answers = dns.resolver.resolve(domain, 'NS')
        actual_ns = [str(rdata.target).rstrip('.').lower() for rdata in answers]
        
        # Verificar si algún NS actual coincide con los esperados
        is_delegated = any(ns in expected_ns_norm for ns in actual_ns)
        
        return is_delegated, actual_ns
    except ImportError:
        raise ImportError("dnspython no está instalado. Ejecuta: pip install dnspython")
    except dns.resolver.NXDOMAIN:
        raise DNSResolutionError(f"El dominio '{domain}' no existe", domain=domain)
    except dns.resolver.NoAnswer:
        raise DNSResolutionError(f"El dominio '{domain}' no tiene registros NS", domain=domain)
    except dns.resolver.Timeout:
        raise NetworkError(f"Timeout al consultar NS de '{domain}'", endpoint=domain)
    except Exception as e:
        raise DNSError(f"Error verificando DNS: {str(e)}", domain=domain)


def obtener_nameservers_actuales(dominio):
    """
    Obtiene los nameservers actuales del dominio mediante DNS lookup.
    Retorna una lista de nameservers o None si hay error.
    """
    try:
        import dns.resolver
        
        # Consultar NS records
        answers = dns.resolver.resolve(dominio, 'NS')
        nameservers = [str(rdata.target).rstrip('.') for rdata in answers]
        
        return nameservers, None
    except ImportError:
        # Si dnspython no está disponible, usar método alternativo
        return obtener_nameservers_alternativo(dominio)
    except dns.resolver.NXDOMAIN:
        return None, f"El dominio '{dominio}' no existe"
    except dns.resolver.NoAnswer:
        return None, f"El dominio '{dominio}' no tiene registros NS configurados"
    except dns.resolver.Timeout:
        return None, f"Timeout al consultar nameservers de '{dominio}'"
    except Exception as e:
        return None, f"Error obteniendo nameservers: {str(e)}"


def obtener_nameservers_alternativo(dominio):
    """
    Método alternativo para obtener nameservers sin dnspython.
    Usa nslookup o dig si están disponibles.
    """
    try:
        import subprocess
        # El dominio ya viene en formato FQDN puro
        
        # Intentar con nslookup (disponible en Windows y Unix)
        try:
            result = subprocess.run(
                ['nslookup', '-type=ns', dominio],
                capture_output=True,
                text=True,
                timeout=10
            )
            
            # Parsear output de nslookup
            nameservers = []
            for line in result.stdout.split('\n'):
                if 'nameserver' in line.lower() or 'name server' in line.lower():
                    parts = line.split()
                    if len(parts) >= 4:
                        ns = parts[-1].rstrip('.')
                        if ns and '.' in ns:
                            nameservers.append(ns)
            
            if nameservers:
                return nameservers, None
        except:
            pass
        
        return None, "No se pudo verificar nameservers (requiere dnspython o nslookup)"
    except Exception as e:
        return None, f"Error en verificación alternativa: {str(e)}"


def obtener_nameservers_cloudflare(zone_id, _api_token):
    """
    Obtiene los nameservers asignados por Cloudflare para la zona.
    """
    try:
        result = make_cloudflare_request("GET", f"zones/{zone_id}")

        if result and result.get("success"):
            zone_data = result["result"]
            return zone_data.get("name_servers", []), zone_data.get("name", "")
        
        return None, _extract_error_message(result, "No se pudo obtener nameservers de Cloudflare")
    except Exception as e:
        return None, str(e)


def verificar_delegacion(dominio_actual, nameservers_cloudflare):
    """
    Verifica si los nameservers actuales del dominio coinciden con los de Cloudflare.
    Retorna True si están delegados correctamente.
    """
    if not dominio_actual or not nameservers_cloudflare:
        return False
    
    # Normalizar nameservers (lowercase y sin punto final)
    ns_actual_norm = [ns.lower().rstrip('.') for ns in dominio_actual]
    ns_cf_norm = [ns.lower().rstrip('.') for ns in nameservers_cloudflare]
    
    # Verificar si al menos uno de los nameservers de Cloudflare está presente
    # (algunos registradores permiten configuración parcial)
    for ns_cf in ns_cf_norm:
        if ns_cf in ns_actual_norm:
            return True
    
    return False


class handler(BaseHTTPRequestHandler):
    """Handler para Vercel Serverless Function"""

    def _reject_invalid_host(self) -> bool:
        host = self.headers.get('Host', '')
        if not is_host_allowed(host):
            self._send_json({
                "status": "error",
                "message": "Host no autorizado",
                "host": host
            }, 400)
            return True
        return False
    
    def _set_headers(self, status_code=200, content_type='application/json'):
        """Configura los headers de respuesta"""
        self.send_response(status_code)
        self.send_header('Content-Type', content_type)
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
        if self._reject_invalid_host():
            return
        self._send_json({"message": "OK"}, 200)
    
    def do_GET(self):
        """Health check"""
        if self._reject_invalid_host():
            return
        self._send_json({
            "status": "ok",
            "message": "API de verificación de delegación DNS funcionando",
            "has_cloudflare_config": bool(CF_API_TOKEN and CF_ZONE_ID)
        }, 200)
    
    def do_POST(self):
        """Verifica el estado de delegación DNS de un dominio"""
        try:
            if self._reject_invalid_host():
                return
            data, parse_error = self._read_json()
            if parse_error:
                self._send_error(f"Error parseando JSON: {parse_error}", 400)
                return
            
            # Obtener y validar dominio
            dominio = data.get("dominio", "").strip().lower()
            
            if not dominio:
                self._send_error("Falta el parámetro 'dominio'", 400)
                return
            
            # Validar formato de dominio (solo FQDN, sin esquemas ni rutas)
            if "://" in dominio:
                self._send_error("No se permiten esquemas (http://, https://). Use solo el dominio FQDN", 400)
                return
            
            if "/" in dominio or "?" in dominio or "#" in dominio or ":" in dominio or "@" in dominio:
                self._send_error("Formato de dominio inválido. Use solo el dominio FQDN (ejemplo: ejemplo.com)", 400)
                return
            
            # Validar que no sea una IP
            import re
            ip_pattern = r"^(\d{1,3}\.){3}\d{1,3}$"
            if re.match(ip_pattern, dominio):
                self._send_error("No se permiten direcciones IP. Use un dominio FQDN", 400)
                return
            
            # Validar formato FQDN básico
            domain_pattern = r"^(?!-)[A-Za-z0-9-]{1,63}(?<!-)(\.[A-Za-z0-9-]{1,63}(?<!-))*\.[A-Za-z]{2,}$"
            if not re.match(domain_pattern, dominio):
                self._send_error("Formato de dominio inválido. Use un dominio FQDN válido (ejemplo: ejemplo.com)", 400)
                return
            
            # Verificar configuración de Cloudflare
            if not CF_API_TOKEN or not CF_ZONE_ID:
                self._send_error(
                    "Cloudflare no está configurado (CF_API_TOKEN y CF_ZONE_ID requeridos)",
                    200,
                    delegado=False,
                    puede_continuar=False,
                )
                return
            
            # Obtener nameservers de Cloudflare
            nameservers_cf, zone_name = obtener_nameservers_cloudflare(CF_ZONE_ID, CF_API_TOKEN)
            
            if not nameservers_cf:
                self._send_json({
                    "status": "error",
                    "message": "No se pudo obtener información de Cloudflare",
                    "delegado": False,
                    "puede_continuar": False
                }, 500)
                return
            
            # Usar la función verify_dns para verificación real
            try:
                esta_delegado, nameservers_actuales = verify_dns(dominio, nameservers_cf)
                
                # Log de auditoría
                log_delegation_check(
                    domain=dominio,
                    delegated=esta_delegado,
                    nameservers=nameservers_actuales,
                    expected_nameservers=nameservers_cf,
                    zone_name=zone_name,
                    verification_method="dns.resolver"
                )
                
                # Construir respuesta exitosa
                response = {
                    "status": "ok",
                    "dominio": dominio,
                    "zona_cloudflare": zone_name,
                    "delegado": esta_delegado,
                    "puede_continuar": esta_delegado,
                    "nameservers_esperados": nameservers_cf,
                    "nameservers_actuales": nameservers_actuales,
                    "mensaje": self._generar_mensaje(esta_delegado, dominio),
                    "timestamp": self._get_timestamp(),
                    "verificacion_real": True
                }
                
                self._send_json(response, 200)
                
            except ImportError as e:
                # Fallback al método alternativo si dnspython no está disponible
                nameservers_actuales, error = obtener_nameservers_actuales(dominio)
                
                if error:
                    self._send_json({
                        "status": "partial",
                        "message": "No se pudo verificar nameservers actuales del dominio",
                        "error": error,
                        "delegado": None,
                        "puede_continuar": False,
                        "nameservers_esperados": nameservers_cf,
                        "nameservers_actuales": None,
                        "instrucciones": "No se pudo verificar automáticamente. Verifica manualmente que los nameservers de tu dominio coincidan con los esperados.",
                        "verificacion_real": False
                    }, 200)
                    return
                
                # Verificar delegación con método alternativo
                esta_delegado = verificar_delegacion(nameservers_actuales, nameservers_cf)
                
                # Log de auditoría con método alternativo
                log_delegation_check(
                    domain=dominio,
                    delegated=esta_delegado,
                    nameservers=nameservers_actuales,
                    expected_nameservers=nameservers_cf,
                    zone_name=zone_name,
                    verification_method="alternative"
                )
                
                response = {
                    "status": "ok",
                    "dominio": dominio,
                    "zona_cloudflare": zone_name,
                    "delegado": esta_delegado,
                    "puede_continuar": esta_delegado,
                    "nameservers_esperados": nameservers_cf,
                    "nameservers_actuales": nameservers_actuales,
                    "mensaje": self._generar_mensaje(esta_delegado, dominio),
                    "timestamp": self._get_timestamp(),
                    "verificacion_real": False,
                    "warning": "Verificación realizada con método alternativo (dnspython no disponible)"
                }
                
                self._send_json(response, 200)
                
            except (ValueError, TimeoutError) as e:
                # Errores específicos de DNS
                self._send_json({
                    "status": "error",
                    "message": str(e),
                    "delegado": False,
                    "puede_continuar": False,
                    "nameservers_esperados": nameservers_cf,
                    "nameservers_actuales": None,
                    "verificacion_real": True
                }, 200)
                
        except Exception as e:
            self._send_json({
                "status": "error",
                "message": f"Error interno del servidor: {str(e)}",
                "type": type(e).__name__
            }, 500)
    
    def _generar_mensaje(self, delegado, dominio):
        """Genera un mensaje descriptivo basado en el estado de delegación"""
        if delegado:
            return f"✅ El dominio '{dominio}' está correctamente delegado a Cloudflare. El sistema puede continuar con la provisión de seguridad."
        else:
            return f"⏳ El dominio '{dominio}' aún NO está delegado a Cloudflare. Por favor actualiza los nameservers en tu registrador y espera la propagación DNS (puede tomar hasta 48 horas)."
    
    def _get_timestamp(self):
        """Retorna timestamp actual en formato ISO"""
        from datetime import datetime
        return datetime.utcnow().isoformat() + "Z"
