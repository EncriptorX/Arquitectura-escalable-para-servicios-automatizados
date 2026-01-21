"""
Vercel Serverless Function - Task Status Endpoint
Retorna el estado actual de una tarea de protección
"""
from http.server import BaseHTTPRequestHandler
import json
import os

# Simulación de almacenamiento en memoria (en producción usar Redis/Database)
# Para Vercel, usaremos archivos temporales en /tmp
TASKS_DIR = "/tmp/cloudflare_tasks"

class handler(BaseHTTPRequestHandler):
    def _set_headers(self, status_code=200):
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
    
    def _send_json(self, data, status_code=200):
        self._set_headers(status_code)
        self.wfile.write(json.dumps(data).encode('utf-8'))
    
    def do_OPTIONS(self):
        self._send_json({"message": "OK"}, 200)
    
    def do_GET(self):
        """Obtiene el estado de una tarea"""
        try:
            # Extraer task_id de la query string
            path_parts = self.path.split('?')
            if len(path_parts) < 2:
                self._send_json({
                    "status": "error",
                    "message": "Missing task_id parameter"
                }, 400)
                return
            
            query_params = {}
            for param in path_parts[1].split('&'):
                if '=' in param:
                    key, value = param.split('=', 1)
                    query_params[key] = value
            
            task_id = query_params.get('task_id')
            if not task_id:
                self._send_json({
                    "status": "error",
                    "message": "Missing task_id parameter"
                }, 400)
                return
            
            # Leer el estado de la tarea desde archivo temporal
            task_file = f"{TASKS_DIR}/{task_id}.json"
            
            if not os.path.exists(task_file):
                self._send_json({
                    "status": "error",
                    "message": "Task not found"
                }, 404)
                return
            
            with open(task_file, 'r') as f:
                task_data = json.load(f)
            
            self._send_json(task_data, 200)
            
        except Exception as e:
            self._send_json({
                "status": "error",
                "message": f"Error retrieving task status: {str(e)}"
            }, 500)
