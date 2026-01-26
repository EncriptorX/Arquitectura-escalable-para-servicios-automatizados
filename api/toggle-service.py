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
        self.wfile.write(json.dumps(data, ensure_ascii=False).encode('utf-8'))
    
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
            
            # Obtener parámetro enabled
            if "enabled" not in data:
                self._send_json({
                    "status": "error",
                    "message": "Falta el parámetro 'enabled' (true/false)"
                }, 400)
                return
            
            enabled = data.get("enabled")
            
            if not isinstance(enabled, bool):
                self._send_json({
                    "status": "error",
                    "message": "El parámetro 'enabled' debe ser booleano (true/false)"
                }, 400)
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
            
        except Exception as e:
            self._send_json({
                "status": "error",
                "message": f"Error cambiando estado del servicio: {str(e)}",
                "type": type(e).__name__
            }, 500)
