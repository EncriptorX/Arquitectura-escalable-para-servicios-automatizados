"""
Vercel Serverless Function - Lista de Clientes CSaaS
Endpoint para listar todos los clientes provisionados y sus mapeos de proxy

FUNCIONALIDAD:
- Lista todos los clientes provisionados en memoria
- Muestra el mapeo subdominio -> dominio real
- Útil para debugging y administración
"""
from http.server import BaseHTTPRequestHandler
import json
import os
import sys

# Agregar el directorio api al path
sys.path.insert(0, os.path.dirname(__file__))

try:
    from config import CSaaSConfig
except ImportError:
    class CSaaSConfig:
        PROVISIONED_CLIENTS = {}

try:
    from proxy import ProxyConfig
except ImportError:
    class ProxyConfig:
        SUBDOMAIN_MAP = {}


# ===============================
# Handler de Vercel
# ===============================
class handler(BaseHTTPRequestHandler):
    """Handler para Vercel Serverless Function"""
    
    def _send_json(self, data: dict, status_code: int = 200):
        """Envía respuesta JSON"""
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
        self.wfile.write(json.dumps(data, ensure_ascii=False).encode('utf-8'))
    
    def do_OPTIONS(self):
        """Maneja preflight CORS"""
        self._send_json({"message": "OK"}, 200)
    
    def do_GET(self):
        """Lista todos los clientes provisionados"""
        try:
            # Obtener clientes provisionados
            clients = []
            for client_key, client_info in CSaaSConfig.PROVISIONED_CLIENTS.items():
                clients.append({
                    "client_key": client_key,
                    "client_name": client_info.get("client_name"),
                    "client_id": client_info.get("client_id"),
                    "subdomain": client_info.get("subdomain"),
                    "protected_url": f"https://{client_info.get('subdomain')}",
                    "origin_urls": client_info.get("origin_urls", []),
                    "custom_hostname_id": client_info.get("custom_hostname_id"),
                    "status": client_info.get("status"),
                    "created_at": client_info.get("created_at"),
                    "security_rules": client_info.get("security_rules", {})
                })
            
            # Obtener mapeo del proxy
            proxy_map = dict(ProxyConfig.SUBDOMAIN_MAP)
            
            # Respuesta
            self._send_json({
                "status": "ok",
                "message": "Lista de clientes CSaaS",
                "total_clients": len(clients),
                "clients": clients,
                "proxy_map": proxy_map,
                "architecture": {
                    "type": "Reverse Proxy (Plan Gratuito)",
                    "description": "Backend proxy inteligente sin custom_origin_server",
                    "flow": "Cliente → Subdominio → Backend Proxy → Dominio Real"
                }
            }, 200)
        
        except Exception as e:
            self._send_json({
                "status": "error",
                "message": f"Error al listar clientes: {str(e)}",
                "error_type": type(e).__name__
            }, 500)
