"""
Sistema de Excepciones Tipadas
Permite distinguir entre diferentes tipos de errores y manejarlos apropiadamente
"""


class BaseAPIError(Exception):
    """Clase base para todas las excepciones de la API"""
    
    def __init__(self, message: str, details: dict = None):
        self.message = message
        self.details = details or {}
        super().__init__(self.message)
    
    def to_dict(self):
        """Convierte la excepción a diccionario para respuesta JSON"""
        return {
            "error_type": self.__class__.__name__,
            "message": self.message,
            "details": self.details
        }


# ============================================
# ERRORES DE USUARIO (4xx)
# ============================================

class ValidationError(BaseAPIError):
    """Error de validación de entrada del usuario"""
    status_code = 400
    error_category = "user_error"
    
    def __init__(self, message: str, field: str = None, **kwargs):
        details = {"field": field} if field else {}
        details.update(kwargs)
        super().__init__(message, details)


class AuthenticationError(BaseAPIError):
    """Error de autenticación (Turnstile, tokens, etc.)"""
    status_code = 403
    error_category = "user_error"
    
    def __init__(self, message: str, reason: str = None, **kwargs):
        details = {"reason": reason} if reason else {}
        details.update(kwargs)
        super().__init__(message, details)


class ResourceNotFoundError(BaseAPIError):
    """Recurso no encontrado"""
    status_code = 404
    error_category = "user_error"


# ============================================
# ERRORES DE CLOUDFLARE (502/503)
# ============================================

class CloudflareAPIError(BaseAPIError):
    """Error de la API de Cloudflare"""
    status_code = 502
    error_category = "cloudflare_error"
    
    def __init__(self, message: str, cf_error_code: int = None, cf_message: str = None, **kwargs):
        details = {
            "cloudflare_error_code": cf_error_code,
            "cloudflare_message": cf_message
        }
        details.update(kwargs)
        super().__init__(message, details)


class CloudflareRateLimitError(CloudflareAPIError):
    """Error de rate limit de Cloudflare"""
    status_code = 429
    
    def __init__(self, message: str = "Rate limit alcanzado", **kwargs):
        super().__init__(message, cf_error_code=10000, **kwargs)


class CloudflarePermissionError(CloudflareAPIError):
    """Error de permisos en Cloudflare"""
    status_code = 403
    
    def __init__(self, message: str = "Permisos insuficientes en Cloudflare", **kwargs):
        super().__init__(message, cf_error_code=10000, **kwargs)


# ============================================
# ERRORES DE DNS
# ============================================

class DNSError(BaseAPIError):
    """Error base de DNS"""
    status_code = 400
    error_category = "dns_error"


class DNSDelegationError(DNSError):
    """Error de delegación DNS"""
    
    def __init__(self, message: str, domain: str = None, expected_ns: list = None, actual_ns: list = None, **kwargs):
        details = {
            "domain": domain,
            "expected_nameservers": expected_ns,
            "actual_nameservers": actual_ns
        }
        details.update(kwargs)
        super().__init__(message, details)


class DNSResolutionError(DNSError):
    """Error de resolución DNS"""
    
    def __init__(self, message: str, domain: str = None, **kwargs):
        details = {"domain": domain}
        details.update(kwargs)
        super().__init__(message, details)


class DNSRecordExistsError(DNSError):
    """Registro DNS ya existe (idempotencia)"""
    status_code = 200  # No es error, es idempotente
    error_category = "idempotent"
    
    def __init__(self, message: str = "Registro DNS ya existe", record_id: str = None, **kwargs):
        details = {"record_id": record_id, "idempotent": True}
        details.update(kwargs)
        super().__init__(message, details)


# ============================================
# ERRORES DE RED
# ============================================

class NetworkError(BaseAPIError):
    """Error de red/conexión"""
    status_code = 503
    error_category = "network_error"
    
    def __init__(self, message: str, endpoint: str = None, **kwargs):
        details = {"endpoint": endpoint}
        details.update(kwargs)
        super().__init__(message, details)


class TimeoutError(NetworkError):
    """Error de timeout"""
    
    def __init__(self, message: str = "Timeout en la operación", timeout: int = None, **kwargs):
        details = {"timeout_seconds": timeout}
        details.update(kwargs)
        super().__init__(message, **details)


# ============================================
# ERRORES LÓGICOS/CONFIGURACIÓN
# ============================================

class ConfigurationError(BaseAPIError):
    """Error de configuración del sistema"""
    status_code = 500
    error_category = "configuration_error"
    
    def __init__(self, message: str, missing_config: str = None, **kwargs):
        details = {"missing_configuration": missing_config}
        details.update(kwargs)
        super().__init__(message, details)


class ServiceDisabledError(BaseAPIError):
    """Servicio deshabilitado"""
    status_code = 503
    error_category = "service_error"
    
    def __init__(self, message: str = "El servicio está deshabilitado temporalmente", **kwargs):
        super().__init__(message, kwargs)


class LogicError(BaseAPIError):
    """Error lógico en el flujo"""
    status_code = 500
    error_category = "logic_error"


# ============================================
# UTILIDADES
# ============================================

def handle_cloudflare_error(error_body: dict, endpoint: str = None) -> CloudflareAPIError:
    """
    Convierte errores de Cloudflare en excepciones tipadas
    
    Args:
        error_body: Cuerpo de error de Cloudflare
        endpoint: Endpoint que generó el error
    
    Returns:
        CloudflareAPIError apropiada
    """
    if not error_body or "errors" not in error_body:
        return CloudflareAPIError("Error desconocido de Cloudflare", endpoint=endpoint)
    
    errors = error_body.get("errors", [])
    if not errors:
        return CloudflareAPIError("Error sin detalles de Cloudflare", endpoint=endpoint)
    
    first_error = errors[0]
    error_code = first_error.get("code")
    error_message = first_error.get("message", "Error desconocido")
    
    # Mapear códigos de error específicos
    if error_code == 81058:
        # Registro DNS ya existe (idempotencia)
        return DNSRecordExistsError(
            "Registro DNS ya existe",
            record_id=first_error.get("id"),
            endpoint=endpoint
        )
    
    elif error_code == 81057:
        # Registro DNS no encontrado
        return ResourceNotFoundError(
            "Registro DNS no encontrado",
            {"cloudflare_error_code": error_code, "endpoint": endpoint}
        )
    
    elif error_code == 10000:
        # Error de autenticación/permisos
        return CloudflarePermissionError(
            error_message,
            endpoint=endpoint
        )
    
    elif error_code == 10001:
        # Rate limit
        return CloudflareRateLimitError(
            error_message,
            endpoint=endpoint
        )
    
    elif error_code == 1004:
        # Error de validación DNS
        return DNSResolutionError(
            error_message,
            endpoint=endpoint
        )
    
    else:
        # Error genérico de Cloudflare
        return CloudflareAPIError(
            error_message,
            cf_error_code=error_code,
            cf_message=error_message,
            endpoint=endpoint
        )


def get_user_friendly_message(error: BaseAPIError) -> str:
    """
    Convierte excepciones técnicas en mensajes amigables para el usuario
    
    Args:
        error: Excepción tipada
    
    Returns:
        Mensaje amigable para el usuario
    """
    error_messages = {
        ValidationError: "Los datos proporcionados no son válidos. Por favor, verifica e intenta nuevamente.",
        AuthenticationError: "Error de verificación de seguridad. Por favor, recarga la página e intenta nuevamente.",
        CloudflareAPIError: "Error comunicándose con Cloudflare. Por favor, intenta nuevamente en unos momentos.",
        CloudflareRateLimitError: "Se ha alcanzado el límite de solicitudes. Por favor, espera unos minutos e intenta nuevamente.",
        CloudflarePermissionError: "Permisos insuficientes. Por favor, contacta al administrador.",
        DNSError: "Error de configuración DNS. Por favor, verifica la configuración del dominio.",
        DNSDelegationError: "El dominio no está correctamente delegado a Cloudflare. Por favor, actualiza los nameservers.",
        DNSResolutionError: "No se pudo resolver el dominio. Verifica que el dominio sea válido.",
        NetworkError: "Error de conexión. Por favor, verifica tu conexión e intenta nuevamente.",
        TimeoutError: "La operación tardó demasiado. Por favor, intenta nuevamente.",
        ConfigurationError: "Error de configuración del sistema. Por favor, contacta al administrador.",
        ServiceDisabledError: "El servicio está temporalmente deshabilitado. Por favor, intenta más tarde.",
        LogicError: "Error interno del sistema. Por favor, contacta al administrador."
    }
    
    error_class = error.__class__
    return error_messages.get(error_class, error.message)


# Ejemplo de uso:
if __name__ == "__main__":
    # Ejemplo 1: Error de validación
    try:
        raise ValidationError("Dominio inválido", field="domain", value="invalid..domain")
    except ValidationError as e:
        print(f"ValidationError: {e.message}")
        print(f"Details: {e.details}")
        print(f"Dict: {e.to_dict()}")
    
    # Ejemplo 2: Error de Cloudflare
    try:
        raise CloudflareAPIError(
            "Error creando zona",
            cf_error_code=1001,
            cf_message="Zone already exists",
            endpoint="/zones"
        )
    except CloudflareAPIError as e:
        print(f"\nCloudflareAPIError: {e.message}")
        print(f"Details: {e.details}")
        print(f"User message: {get_user_friendly_message(e)}")
    
    # Ejemplo 3: Error de DNS
    try:
        raise DNSDelegationError(
            "Dominio no delegado",
            domain="example.com",
            expected_ns=["ns1.cloudflare.com"],
            actual_ns=["ns1.registrar.com"]
        )
    except DNSDelegationError as e:
        print(f"\nDNSDelegationError: {e.message}")
        print(f"Details: {e.details}")
