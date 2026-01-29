"""
Vercel Serverless Function - Toggle Service
Permite activar o desactivar el servicio de protección globalmente
"""
from http.server import BaseHTTPRequestHandler
import json
import sys
import os

# Agregar el directorio api al path para importar config
sys.path.insert(0, os.path.dirname(__file__))

try:
    from config import is_service_enabled, toggle_service
except ImportError:
    # Fallback si no se puede importar
    SERVICE_ENABLED = True
    
    def is_service_enabled():
        return SERVICE_ENABLED
    
    def toggle_service(state: bool):
        global SERVICE_ENABLED
        SERVICE_ENABLED = state
        return SERVICE_ENABLED

try:
    from logger import service_logger, log_service_toggle
    LOGGING_AVAILABLE = True
except ImportError:
    LOGGING_AVAILABLE = False
    service_logger = None
    log_service_toggle = lambda *args, **kwargs: None

try:
    from exceptions import (
        BaseAPIError,
        ValidationError,
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
    get_user_friendly_message = lambda e: str(e)


class handler(BaseHTTPRequestHandler):
    """Handler para Vercel Serverless Function"""
    
    def _set_headers(self, status_code=200, content_type='application/json'):
        """Configura los headers de respuesta"""
        self.send_response(status_code)
        self.send_header('Content-Type', content_type)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
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
        self._send_json({"message": "OK"}, 200)
    
    def do_GET(self):
        """Obtiene el estado actual del servicio"""
        try:
            enabled = is_service_enabled()
            
            self._send_json({
                "status": "ok",
                "service_enabled": enabled,
                "message": f"Servicio {'habilitado' if enabled else 'deshabilitado'}"
            }, 200)
            
        except Exception as e:
            self._send_json({
                "status": "error",
                "message": f"Error obteniendo estado del servicio: {str(e)}",
                "type": type(e).__name__
            }, 500)
    
    def do_POST(self):
        """Activa o desactiva el servicio"""
        try:
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
            
            # Obtener parámetro enabled
            if "enabled" not in data:
                if EXCEPTIONS_AVAILABLE:
                    error = ValidationError("Falta el parámetro 'enabled' (true/false)", field="enabled")
                    self._send_error(
                        error.message,
                        error.status_code,
                        error_type=error.__class__.__name__,
                        error_category=error.error_category,
                    )
                else:
                    self._send_error("Falta el parámetro 'enabled' (true/false)", 400)
                return
            
            enabled = data.get("enabled")
            
            if not isinstance(enabled, bool):
                if EXCEPTIONS_AVAILABLE:
                    error = ValidationError(
                        "El parámetro 'enabled' debe ser booleano (true/false)",
                        field="enabled",
                        value=enabled,
                        expected_type="boolean"
                    )
                    self._send_error(
                        error.message,
                        error.status_code,
                        error_type=error.__class__.__name__,
                        error_category=error.error_category,
                    )
                else:
                    self._send_error("El parámetro 'enabled' debe ser booleano (true/false)", 400)
                return
            
            # Obtener estado anterior
            previous_state = is_service_enabled()
            
            # Cambiar estado del servicio
            new_state = toggle_service(enabled)
            
            # Log de auditoría
            log_service_toggle(
                enabled=new_state,
                previous_state=previous_state,
                remote_ip=self.headers.get("X-Forwarded-For", "").split(",")[0].strip()
            )
            
            if LOGGING_AVAILABLE and service_logger:
                service_logger.info(
                    f"Servicio {'habilitado' if new_state else 'deshabilitado'}",
                    enabled=new_state,
                    previous_state=previous_state
                )
            
            self._send_json({
                "status": "ok",
                "service_enabled": new_state,
                "message": f"Servicio {'habilitado' if new_state else 'deshabilitado'} exitosamente",
                "previous_state": previous_state
            }, 200)
        
        except BaseAPIError as e:
            # Capturar excepciones tipadas
            self._send_error(
                get_user_friendly_message(e) if EXCEPTIONS_AVAILABLE else str(e),
                getattr(e, 'status_code', 500),
                error_type=e.__class__.__name__ if EXCEPTIONS_AVAILABLE else "Error",
                error_category=e.error_category if EXCEPTIONS_AVAILABLE else "unknown",
                technical_message=e.message if EXCEPTIONS_AVAILABLE else str(e),
            )
        
        except Exception as e:
            self._send_error(
                f"Error cambiando estado del servicio: {str(e)}",
                500,
                error_type=type(e).__name__,
                error_category="internal_error",
            )
