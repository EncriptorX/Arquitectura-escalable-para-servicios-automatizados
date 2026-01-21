"""
Vercel Serverless Function - Simplified
"""
from flask import Flask, request, jsonify
import os
import re

app = Flask(__name__)

# Configuración
TURNSTILE_SECRET_KEY = os.getenv("TURNSTILE_SECRET_KEY")


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
        import requests
        
        url = "https://challenges.cloudflare.com/turnstile/v0/siteverify"
        data = {
            "secret": TURNSTILE_SECRET_KEY,
            "response": token
        }
        
        if ip:
            data["remoteip"] = ip

        r = requests.post(url, data=data, timeout=10)
        result = r.json()
        
        if result.get("success", False):
            return True, None
        
        codes = result.get("error-codes") or result.get("error_codes") or []
        msg = "Verificación Turnstile fallida"
        if codes:
            msg += f". Códigos: {', '.join(codes)}"
        return False, msg
    except ImportError:
        return False, "Módulo requests no disponible"
    except Exception as e:
        return False, f"Error conectando con Turnstile: {str(e)}"


@app.after_request
def after_request(response):
    """Agregar headers CORS a todas las respuestas"""
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
    response.headers.add('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    return response


@app.route('/', methods=['GET', 'POST', 'OPTIONS'])
@app.route('/api/solicitar-proteccion', methods=['GET', 'POST', 'OPTIONS'])
def handler():
    """Endpoint principal"""
    
    try:
        # Manejar preflight CORS
        if request.method == 'OPTIONS':
            return jsonify({"message": "OK"}), 200
        
        # Health check
        if request.method == 'GET':
            return jsonify({
                "status": "ok",
                "message": "API funcionando correctamente",
                "method": request.method,
                "path": request.path,
                "has_turnstile_key": bool(TURNSTILE_SECRET_KEY)
            }), 200
        
        # POST - Procesar solicitud
        if request.method == 'POST':
            # Parsear datos
            try:
                data = request.get_json(force=True)
            except Exception as e:
                return jsonify({
                    "status": "error",
                    "message": f"Error parseando JSON: {str(e)}"
                }), 400
            
            # Validar token de Turnstile
            token = data.get("turnstileToken")
            if not token:
                return jsonify({
                    "status": "error",
                    "message": "Falta el token de seguridad (Turnstile)"
                }), 400
            
            # Obtener IP del cliente
            client_ip = request.headers.get("X-Forwarded-For", "").split(",")[0].strip()
            if not client_ip:
                client_ip = request.headers.get("X-Real-IP", "")
            
            # Validar con Cloudflare Turnstile
            ok, err = validate_turnstile(token, client_ip)
            
            if not ok:
                status_code = 500 if "TURNSTILE_SECRET_KEY" in (err or "") else 403
                return jsonify({
                    "status": "error",
                    "message": err or "Verificación de seguridad fallida"
                }), status_code
            
            # Obtener URLs
            urls = data.get("urls", [])
            if not urls:
                return jsonify({
                    "status": "error",
                    "message": "No se proporcionaron URLs"
                }), 400
            
            # Validar formato de URLs
            for url in urls:
                if not validar_url(url):
                    return jsonify({
                        "status": "error",
                        "message": f"URL inválida: {url}"
                    }), 400
            
            # Procesar las URLs
            protegidos = []
            for url in urls:
                dominio = url.replace("https://", "").replace("http://", "").split("/")[0]
                protegidos.append({
                    "dominio": dominio,
                    "estado": "Protección perimetral iniciada"
                })
            
            # Respuesta exitosa
            return jsonify({
                "status": "ok",
                "message": "Protección perimetral en proceso",
                "urls": urls,
                "sitios": protegidos
            }), 200
        
        # Método no soportado
        return jsonify({
            "status": "error",
            "message": f"Método {request.method} no soportado"
        }), 405
        
    except Exception as e:
        # Capturar cualquier error no manejado
        return jsonify({
            "status": "error",
            "message": f"Error interno del servidor: {str(e)}",
            "type": type(e).__name__
        }), 500


# Para desarrollo local
if __name__ == '__main__':
    app.run(debug=True, port=5000)
