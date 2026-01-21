"""
Vercel Serverless Function - Native Format (No Flask)
"""
from http.server import BaseHTTPRequestHandler
import json
import os
import re
import urllib.request
import urllib.parse


# Configuración
TURNSTILE_SECRET_KEY = os.getenv("TURNSTILE_SECRET_KEY", "")


def validar_url(url):
    """Valida que la URL tenga un formato correcto"""
    regex = re.compile(
        r'^(https?:\/\/)?(([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,})(\/.*)?$'
    )
    return re.match(regex, url) is not None


def validate_turnstile(token, ip=None):
    """Valida el token de Turnstile con la API de Cloudflare"""
    if not TURNSTILE_SECRET_KEY:
        return False, "TURNSTILE_SECRET_KEY no está configurada"

    try:
        url = "https://challenges.cloudflare.com/turnstile/v0/siteverify"
        data = {
            "secret": TURNSTILE_SECRET_KEY,
            "response": token
        }
        
        if ip:
            data["remoteip"] = ip
        
        # Usar urllib en lugar de requests
        data_encoded = urllib.parse.urlencode(data).encode('utf-8')
        req = urllib.request.Request(url, data=data_encoded, method='POST')
        
        with urllib.request.urlopen(req, timeout=10) as response:
            result = json.loads(response.read().decode('utf-8'))
        
        if result.get("success", False):
            return True, None
        
        codes = result.get("error-codes") or result.get("error_codes") or []
        msg = "Verificación Turnstile fallida"
        if codes:
            msg += f". Códigos: {', '.join(codes)}"
        return False, msg
    except Exception as e:
        return False, f"Error conectando con Turnstile: {str(e)}"


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
        self.wfile.write(json.dumps(data).encode('utf-8'))
    
    def do_OPTIONS(self):
        """Maneja preflight CORS"""
        self._send_json({"message": "OK"}, 200)
    
    def do_GET(self):
        """Health check"""
        self._send_json({
            "status": "ok",
            "message": "API funcionando correctamente",
            "has_turnstile_key": bool(TURNSTILE_SECRET_KEY)
        }, 200)
    
    def do_POST(self):
        """Procesa la solicitud de protección"""
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
            
            # Validar token de Turnstile
            token = data.get("turnstileToken")
            if not token:
                self._send_json({
                    "status": "error",
                    "message": "Falta el token de seguridad (Turnstile)"
                }, 400)
                return
            
            # Obtener IP del cliente
            client_ip = self.headers.get("X-Forwarded-For", "").split(",")[0].strip()
            if not client_ip:
                client_ip = self.headers.get("X-Real-IP", "")
            
            # Validar con Cloudflare Turnstile
            ok, err = validate_turnstile(token, client_ip)
            
            if not ok:
                status_code = 500 if "TURNSTILE_SECRET_KEY" in (err or "") else 403
                self._send_json({
                    "status": "error",
                    "message": err or "Verificación de seguridad fallida"
                }, status_code)
                return
            
            # Obtener URLs
            urls = data.get("urls", [])
            if not urls:
                self._send_json({
                    "status": "error",
                    "message": "No se proporcionaron URLs"
                }, 400)
                return
            
            # Validar formato de URLs
            for url in urls:
                if not validar_url(url):
                    self._send_json({
                        "status": "error",
                        "message": f"URL inválida: {url}"
                    }, 400)
                    return
            
            # Procesar las URLs
            protegidos = []
            for url in urls:
                dominio = url.replace("https://", "").replace("http://", "").split("/")[0]
                protegidos.append({
                    "dominio": dominio,
                    "estado": "Protección perimetral iniciada"
                })
            
            # Respuesta exitosa
            self._send_json({
                "status": "ok",
                "message": "Protección perimetral en proceso",
                "urls": urls,
                "sitios": protegidos
            }, 200)
            
        except Exception as e:
            # Capturar cualquier error no manejado
            self._send_json({
                "status": "error",
                "message": f"Error interno del servidor: {str(e)}",
                "type": type(e).__name__
            }, 500)
