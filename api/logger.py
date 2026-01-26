"""
Sistema de Logging Estructurado para Auditoría
Proporciona logging centralizado con contexto estructurado
"""
import logging
import json
import os
from datetime import datetime
from typing import Dict, Any, Optional


# Configuración del nivel de logging desde variable de entorno
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()

# Configurar logging básico
logging.basicConfig(
    level=getattr(logging, LOG_LEVEL, logging.INFO),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)


class StructuredLogger:
    """Logger estructurado para auditoría y trazabilidad"""
    
    def __init__(self, name: str):
        self.logger = logging.getLogger(name)
        self.context = {}
    
    def set_context(self, **kwargs):
        """Establece contexto global para este logger"""
        self.context.update(kwargs)
    
    def _format_message(self, message: str, extra: Optional[Dict[str, Any]] = None) -> str:
        """Formatea mensaje con contexto estructurado"""
        data = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "message": message,
            **self.context
        }
        
        if extra:
            data.update(extra)
        
        return json.dumps(data, ensure_ascii=False)
    
    def info(self, message: str, **extra):
        """Log nivel INFO con contexto estructurado"""
        self.logger.info(self._format_message(message, extra))
    
    def warning(self, message: str, **extra):
        """Log nivel WARNING con contexto estructurado"""
        self.logger.warning(self._format_message(message, extra))
    
    def error(self, message: str, **extra):
        """Log nivel ERROR con contexto estructurado"""
        self.logger.error(self._format_message(message, extra))
    
    def debug(self, message: str, **extra):
        """Log nivel DEBUG con contexto estructurado"""
        self.logger.debug(self._format_message(message, extra))
    
    def audit(self, audit_action: str, **extra):
        """Log de auditoría con acción específica"""
        # Evitar conflicto con 'action' en extra
        audit_data = {"action": audit_action, "audit": True}
        audit_data.update(extra)
        self.info(f"AUDIT: {audit_action}", **audit_data)


# Loggers predefinidos para diferentes módulos
def get_logger(name: str) -> StructuredLogger:
    """Obtiene un logger estructurado para el módulo especificado"""
    return StructuredLogger(name)


# Logger para solicitudes de protección
protection_logger = get_logger("protection")

# Logger para verificación de delegación
delegation_logger = get_logger("delegation")

# Logger para control de servicio
service_logger = get_logger("service")

# Logger para toggle de protección
toggle_logger = get_logger("toggle_protection")

# Logger para diagnóstico
diagnostic_logger = get_logger("diagnostic")


# Funciones de conveniencia para logging de auditoría
def log_protection_request(domain: str, origin_ip: str, status: str, **extra):
    """Registra solicitud de protección"""
    protection_logger.audit(
        "protection_request",
        domain=domain,
        origin_ip=origin_ip,
        status=status,
        **extra
    )


def log_dns_configuration(domain: str, record_type: str, content: str, proxied: bool, **extra):
    """Registra configuración DNS"""
    protection_logger.audit(
        "dns_configuration",
        domain=domain,
        record_type=record_type,
        content=content,
        proxied=proxied,
        **extra
    )


def log_security_setting(setting: str, value: Any, zone_id: str, **extra):
    """Registra cambio de configuración de seguridad"""
    protection_logger.audit(
        "security_setting_change",
        setting=setting,
        value=value,
        zone_id=zone_id,
        **extra
    )


def log_firewall_rule(rule_id: str, rule_action: str, description: str, **extra):
    """Registra creación/modificación de regla de firewall"""
    protection_logger.audit(
        "firewall_rule_change",
        rule_id=rule_id,
        rule_action=rule_action,
        description=description,
        **extra
    )


def log_delegation_check(domain: str, delegated: bool, nameservers: list, **extra):
    """Registra verificación de delegación DNS"""
    delegation_logger.audit(
        "delegation_check",
        domain=domain,
        delegated=delegated,
        nameservers=nameservers,
        **extra
    )


def log_service_toggle(enabled: bool, previous_state: bool, **extra):
    """Registra cambio de estado del servicio"""
    service_logger.audit(
        "service_toggle",
        enabled=enabled,
        previous_state=previous_state,
        **extra
    )


def log_protection_toggle(enabled: bool, domain: Optional[str] = None, **extra):
    """Registra activación/desactivación de protecciones"""
    toggle_logger.audit(
        "protection_toggle",
        enabled=enabled,
        domain=domain,
        **extra
    )


def log_api_error(endpoint: str, error: str, error_type: str, **extra):
    """Registra error en API"""
    logger = get_logger("api_error")
    logger.error(
        f"API Error: {endpoint}",
        endpoint=endpoint,
        error=error,
        error_type=error_type,
        **extra
    )


def log_turnstile_verification(success: bool, remote_ip: Optional[str] = None, **extra):
    """Registra verificación de Turnstile"""
    logger = get_logger("security")
    logger.audit(
        "turnstile_verification",
        success=success,
        remote_ip=remote_ip,
        **extra
    )


# Ejemplo de uso:
if __name__ == "__main__":
    # Ejemplo de logging estructurado
    logger = get_logger("example")
    
    logger.info("Sistema iniciado", version="1.0.0", environment="production")
    
    logger.audit(
        "zone_created",
        domain="example.com",
        zone_id="abc123",
        nameservers=["ns1.cloudflare.com", "ns2.cloudflare.com"]
    )
    
    logger.warning("Límite de rate alcanzado", requests=100, limit=100)
    
    logger.error("Error de conexión", service="cloudflare_api", timeout=30)
    
    # Logging de auditoría específico
    log_protection_request(
        domain="example.com",
        origin_ip="192.0.2.1",
        status="success",
        operations={"dns": True, "waf": True, "ssl": True}
    )
    
    log_dns_configuration(
        domain="example.com",
        record_type="A",
        content="192.0.2.1",
        proxied=True,
        ttl=1
    )
    
    log_security_setting(
        setting="waf",
        value="on",
        zone_id="abc123",
        previous_value="off"
    )
    
    log_service_toggle(
        enabled=False,
        previous_state=True,
        reason="maintenance"
    )
