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
def response(status, body):
    return {
        "statusCode": status,
        "headers": {
            "Content-Type": "application/json"
        },
        "body": json.dumps(body)
    }

def validar_url(url):
    regex = re.compile(
        r'^(https?:\/\/)?'      # http o https
        r'(([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,})'
        r'(\/.*)?$'
    )
    return re.match(regex, url)

# ===============================
# Handler principal (Vercel)
# ===============================
def handler(request):

    # -------- Método --------
    if request.method != "POST":
        return response(405, {"error": "Método no permitido"})

    # -------- Body --------
    try:
        data = json.loads(request.body)
    except Exception:
        return response(400, {"error": "JSON inválido"})

    company = data.get("company")
    email = data.get("email")
    urls = data.get("urls", [])
    turnstile_token = data.get("turnstileToken")

    if not company or not email or not urls or not turnstile_token:
        return response(400, {"error": "Datos incompletos"})

    # -------- Validar URLs --------
    for url in urls:
        if not validar_url(url):
            return response(400, {"error": f"URL inválida: {url}"})

    # ===============================
    # Validación Turnstile
    # ===============================
    ts_response = requests.post(
        "https://challenges.cloudflare.com/turnstile/v0/siteverify",
        data={
            "secret": TURNSTILE_SECRET_KEY,
            "response": turnstile_token
        },
        timeout=10
    )

    ts_result = ts_response.json()

    if not ts_result.get("success"):
        return response(403, {
            "error": "Captcha inválido",
            "details": ts_result
        })

    # ===============================
    # Cloudflare API (ejemplo básico)
    # ===============================
    headers = {
        "Authorization": f"Bearer {CF_API_TOKEN}",
        "Content-Type": "application/json"
    }

    protegidos = []

    for url in urls:
        dominio = url.replace("https://", "").replace("http://", "").split("/")[0]

        # ⚠ Aquí SOLO simulamos la protección
        # En producción:
        # - Crear zona
        # - Activar proxy
        # - Activar WAF
        # - Forzar HTTPS
        # - Reglas firewall

        protegidos.append({
            "dominio": dominio,
            "estado": "Protección perimetral iniciada"
        })

    # ===============================
    # Respuesta final
    # ===============================
    return response(200, {
        "message": "Solicitud procesada correctamente",
        "empresa": company,
        "email": email,
        "sitios": protegidos
    })
