import json
import os
import re
import requests
from urllib.parse import parse_qs

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


# ===============================
# Handler principal (Vercel)
# ===============================
def handler(request):
    """
    Vercel Serverless Function handler
    request es un objeto Request de Vercel
    """
    # Headers CORS
    cors_headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Content-Type": "application/json"
    }
    
    # Manejar preflight CORS
    if request.method == "OPTIONS":
        return {
            "statusCode": 200,
            "headers": cors_headers,
            "body": json.dumps({"message": "OK"})
        }
    
    # Health check
    if request.method == "GET":
        return {
            "statusCode": 200,
            "headers": cors_headers,
            "body": json.dumps({
                "status": "ok",
                "message": "API funcionando correctamente"
            })
        }
    
    # Solo aceptar POST
    if request.method != "POST":
        return {
            "statusCode": 405,
            "headers": cors_headers,
            "body": json.dumps({
                "status": "error",
                "message": f"Método {request.method} no permitido"
            })
        }
    
    try:
        # Parsear el body
        try:
            data = request.get_json(force=True)
        except:
            # Intentar parsear como string
            body_str = request.get_data(as_text=True)
            data = json.loads(body_str) if body_str else {}
        
        # Validar token de Turnstile
        token = data.get("turnstileToken")
        if not token:
            return {
                "statusCode": 400,
                "headers": cors_headers,
                "body": json.dumps({
                    "status": "error",
                    "message": "Falta el token de seguridad (Turnstile)"
                })
            }
        
        # Obtener IP del cliente
        client_ip = request.headers.get("x-forwarded-for", "").split(",")[0].strip()
        if not client_ip:
            client_ip = request.headers.get("x-real-ip", "")
        
        # Validar con Cloudflare Turnstile
        ok, err = validate_turnstile(token, client_ip)
        
        if not ok:
            status_code = 500 if "TURNSTILE_SECRET_KEY" in (err or "") else 403
            return {
                "statusCode": status_code,
                "headers": cors_headers,
                "body": json.dumps({
                    "status": "error",
                    "message": err or "Verificación de seguridad fallida"
                })
            }
        
        # Obtener URLs
        urls = data.get("urls", [])
        if not urls:
            return {
                "statusCode": 400,
                "headers": cors_headers,
                "body": json.dumps({
                    "status": "error",
                    "message": "No se proporcionaron URLs"
                })
            }
        
        # Validar formato de URLs
        for url in urls:
            if not validar_url(url):
                return {
                    "statusCode": 400,
                    "headers": cors_headers,
                    "body": json.dumps({
                        "status": "error",
                        "message": f"URL inválida: {url}"
                    })
                }
        
        # Procesar las URLs (simulación)
        protegidos = []
        for url in urls:
            dominio = url.replace("https://", "").replace("http://", "").split("/")[0]
            protegidos.append({
                "dominio": dominio,
                "estado": "Protección perimetral iniciada"
            })
        
        # Respuesta exitosa
        return {
            "statusCode": 200,
            "headers": cors_headers,
            "body": json.dumps({
                "status": "ok",
                "message": "Protección perimetral en proceso",
                "urls": urls,
                "sitios": protegidos
            })
        }
    
    except json.JSONDecodeError as e:
        return {
            "statusCode": 400,
            "headers": cors_headers,
            "body": json.dumps({
                "status": "error",
                "message": f"JSON inválido: {str(e)}"
            })
        }
    except Exception as e:
        return {
            "statusCode": 500,
            "headers": cors_headers,
            "body": json.dumps({
                "status": "error",
                "message": f"Error interno: {str(e)}"
            })
        }
