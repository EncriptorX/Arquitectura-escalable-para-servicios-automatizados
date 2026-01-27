"""
Vercel Serverless Function - Listar Clientes CSaaS
Endpoint para consultar clientes provisionados en Cloudflare for SaaS
"""
from http.server import BaseHTTPRequestHandler
import json
import os
import sys
import urllib.request

# Agregar el directorio api al path
sys.path.insert(0, os.path.dirname(__file__))

try:
    from config import CF_API_TOKEN, CF_ZONE_ID, CF_API_BASE_URL
except ImportError:
    CF_API_TOKEN = os.getenv("CF_API_TOKEN", "")
    CF_ZONE_ID = os.getenv("CF_ZONE_ID", "")
    CF_API_BASE_URL = "https://api.cloudflare.com/client/v4"


class handler(BaseHTTPRequestHandler):
    """Handler para listar Custom Hostnames"""
    
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
        """Lista todos los Custom Hostnames provisionados"""
        try:
            # Verificar configuración
            if not CF_API_TOKEN or not CF_ZONE_ID:
                self._send_json({
                    "status": "error",
                    "message": "Cloudflare no está configurado"
                }, 500)
                return
            
            # Consultar Custom Hostnames
            url = f"{CF_API_BASE_URL}/zones/{CF_ZONE_ID}/custom_hostnames"
            headers = {
                "Authorization": f"Bearer {CF_API_TOKEN}",
                "Content-Type": "application/json"
            }
            
            req = urllib.request.Request(url, headers=headers, method='GET')
            
            with urllib.request.urlopen(req, timeout=30) as response:
                result = json.loads(response.read().decode('utf-8'))
            
            if result.get("success"):
                custom_hostnames = result.get("result", [])
                
                # Formatear resultados
                clients = []
                for ch in custom_hostnames:
                    clients.append({
                        "id": ch.get("id"),
                        "hostname": ch.get("hostname"),
                        "status": ch.get("status"),
                        "ssl_status": ch.get("ssl", {}).get("status"),
                        "created_at": ch.get("created_at"),
                        "verification_errors": ch.get("verification_errors", [])
                    })
                
                self._send_json({
                    "status": "ok",
                    "total": len(clients),
                    "clients": clients
                }, 200)
            else:
                self._send_json({
                    "status": "error",
                    "message": "Error consultando Custom Hostnames",
                    "errors": result.get("errors", [])
                }, 500)
        
        except Exception as e:
            self._send_json({
                "status": "error",
                "message": f"Error interno: {str(e)}"
            }, 500)
