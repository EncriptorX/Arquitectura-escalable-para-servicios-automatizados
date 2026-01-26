"""
Configuración centralizada para las APIs de Cloudflare
"""
import os

# Cloudflare API Configuration
CF_API_TOKEN = os.getenv("CF_API_TOKEN", "")
CF_ZONE_ID = os.getenv("CF_ZONE_ID", "")
CF_API_BASE_URL = "https://api.cloudflare.com/client/v4"

# Turnstile Configuration
TURNSTILE_SECRET_KEY = os.getenv("TURNSTILE_SECRET_KEY", "")
TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"

# API Configuration
API_TIMEOUT = 30
DNS_PROPAGATION_TIME = "15 minutos a 48 horas"

# Security Settings
ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:3000",
    "https://*.vercel.app"
]

# Service State (Global)
SERVICE_ENABLED = True

def get_headers():
    """Retorna headers para peticiones a Cloudflare API"""
    return {
        "Authorization": f"Bearer {CF_API_TOKEN}",
        "Content-Type": "application/json"
    }

def is_configured():
    """Verifica si las credenciales están configuradas"""
    return bool(CF_API_TOKEN and CF_ZONE_ID and TURNSTILE_SECRET_KEY)

def get_config_status():
    """Retorna el estado de configuración"""
    return {
        "CF_API_TOKEN": {
            "configurado": bool(CF_API_TOKEN),
            "preview": CF_API_TOKEN[:10] + "..." if CF_API_TOKEN else None,
            "longitud": len(CF_API_TOKEN) if CF_API_TOKEN else 0
        },
        "CF_ZONE_ID": {
            "configurado": bool(CF_ZONE_ID),
            "preview": CF_ZONE_ID[:8] + "..." if CF_ZONE_ID else None,
            "longitud": len(CF_ZONE_ID) if CF_ZONE_ID else 0
        },
        "TURNSTILE_SECRET_KEY": {
            "configurado": bool(TURNSTILE_SECRET_KEY),
            "preview": TURNSTILE_SECRET_KEY[:8] + "..." if TURNSTILE_SECRET_KEY else None,
            "longitud": len(TURNSTILE_SECRET_KEY) if TURNSTILE_SECRET_KEY else 0
        }
    }

def is_service_enabled():
    """Verifica si el servicio está habilitado"""
    return SERVICE_ENABLED

def toggle_service(state: bool):
    """Activa o desactiva el servicio globalmente"""
    global SERVICE_ENABLED
    SERVICE_ENABLED = state
    return SERVICE_ENABLED
