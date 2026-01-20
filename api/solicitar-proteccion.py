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
def json_response(status, body):
    return {
        "statusCode": status,
        "headers": {
            "Content-Type": "application/json"
        },
        "body": json.dumps(body)
    }


def validar_url(url):
    regex = re.compile(
        r'^(https?:\/\/)?(([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,})(\/.*)?$'
    )
    return re.match(regex, url)

# ===============================
# Handler principal (Vercel)
# ===============================
def handler(request):

    if request.method != "POST":
        return json_response(405, {"error": "Método no permitido"})

    try:
        data = request.get_json()
    except Exception:
        return json_response(400, {"error": "JSON inválido"})

    token = data.get("turnstileToken")

    if not token:
        return json_response(400, {"error": "Token Turnstile faltante"})

    # 🔐 Validación Turnstile
    ts_verify = requests.post(
        "https://challenges.cloudflare.com/turnstile/v0/siteverify",
        data={
            "secret": TURNSTILE_SECRET_KEY,
            "response": token
        },
        timeout=10
    )

    result = ts_verify.json()

    if not result.get("success"):
        return json_response(403, {
            "error": "Captcha inválido",
            "details": result
        })

    return json_response(200, {
        "message": "Turnstile validado correctamente"
    })
