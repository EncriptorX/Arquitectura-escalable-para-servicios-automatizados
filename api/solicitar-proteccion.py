import json
import os
import re
import requests

# ===============================
# Configuración desde Vercel ENV
# ===============================
CF_API_TOKEN = os.getenv("CF_API_TOKEN")
CF_ACCOUNT_ID = os.getenv("CF_ACCOUNT_ID")
TURNSTILE_SECRET_KEY = os.getenv("TURNSTILE_SECRET_KEY")


# ===============================
# Utilidades
# ===============================
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

    url = "https://challenges.cloudflare.com/turnstile/v0/siteverify"
    data = {
        "secret": TURNSTILE_SECRET_KEY,
        "response": token
    }
    
    if ip:
        data["remoteip"] = ip

    try:
        r = requests.post(url, data=data, timeout=10)
        result = r.json()
        
        if result.get("success", False):
            return True, None
        
        codes = result.get("error-codes") or result.get("error_codes") or []
        msg = "Verificación Turnstile fallida"
        if codes:
            msg += f". Códigos: {', '.join(codes)}"
        return False, msg
    except Exception as e:
        return False, f"Error conectando con Turnstile: {str(e)}"


def json_response(status_code, body):
    """Helper para crear respuestas JSON con CORS"""
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type"
        },
        "body": json.dumps(body)
    }


# ===============================
# Handler principal (Vercel)
# ===============================
def handler(event, context):
    """
    Vercel Serverless Function handler
    """
    # Manejar preflight CORS
    if event.get("httpMethod") == "OPTIONS":
        return json_response(200, {"message": "OK"})
    
    # Health check
    if event.get("httpMethod") == "GET":
        return json_response(200, {
            "status": "ok",
            "message": "API funcionando correctamente"
        })
    
    # Solo aceptar POST
    if event.get("httpMethod") != "POST":
        return json_response(405, {
            "status": "error",
            "message": "Método no permitido"
        })
    
    try:
        # Parsear el body
        body = event.get("body", "{}")
        if isinstance(body, str):
            data = json.loads(body)
        else:
            data = body
        
        # Validar token de Turnstile
        token = data.get("turnstileToken")
        if not token:
            return json_response(400, {
                "status": "error",
                "message": "Falta el token de seguridad (Turnstile)"
            })
        
        # Obtener IP del cliente
        headers = event.get("headers", {})
        client_ip = headers.get("x-forwarded-for", "").split(",")[0].strip()
        
        # Validar con Cloudflare Turnstile
        ok, err = validate_turnstile(token, client_ip)
        
        if not ok:
            status_code = 500 if "TURNSTILE_SECRET_KEY" in (err or "") else 403
            return json_response(status_code, {
                "status": "error",
                "message": err or "Verificación de seguridad fallida"
            })
        
        # Obtener URLs
        urls = data.get("urls", [])
        if not urls:
            return json_response(400, {
                "status": "error",
                "message": "No se proporcionaron URLs"
            })
        
        # Validar formato de URLs
        for url in urls:
            if not validar_url(url):
                return json_response(400, {
                    "status": "error",
                    "message": f"URL inválida: {url}"
                })
        
        # Procesar las URLs (simulación)
        protegidos = []
        for url in urls:
            dominio = url.replace("https://", "").replace("http://", "").split("/")[0]
            protegidos.append({
                "dominio": dominio,
                "estado": "Protección perimetral iniciada"
            })
        
        # Respuesta exitosa
        return json_response(200, {
            "status": "ok",
            "message": "Protección perimetral en proceso",
            "urls": urls,
            "sitios": protegidos
        })
    
    except json.JSONDecodeError:
        return json_response(400, {
            "status": "error",
            "message": "JSON inválido"
        })
    except Exception as e:
        return json_response(500, {
            "status": "error",
            "message": f"Error interno: {str(e)}"
        })
