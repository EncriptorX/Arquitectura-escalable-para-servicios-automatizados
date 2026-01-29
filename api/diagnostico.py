"""
Endpoint de diagnóstico para verificar la configuración del servicio
"""
from http.server import BaseHTTPRequestHandler
import json
import os

try:
    from utils import get_cors_headers
except ImportError:
    def get_cors_headers(origin):
        allowed_origins = {
            item.strip().lower()
            for item in os.getenv("ALLOWED_ORIGINS", "").split(",")
            if item.strip()
        }
        normalized_origin = (origin or "").strip().lower()
        allowed_origin = normalized_origin if normalized_origin in allowed_origins else "null"
        return {
            "Access-Control-Allow-Origin": allowed_origin,
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
            "Vary": "Origin",
        }


class handler(BaseHTTPRequestHandler):
    """Handler de diagnóstico"""
    
    def _set_headers(self, status_code=200):
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json')
        origin = self.headers.get('Origin')
        for key, value in get_cors_headers(origin).items():
            self.send_header(key, value)
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('X-Frame-Options', 'DENY')
        self.send_header('Content-Security-Policy', "frame-ancestors 'none'")
        self.send_header('Referrer-Policy', 'no-referrer')
        self.send_header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')
        self.send_header('Permissions-Policy', 'geolocation=(), microphone=(), camera=(), payment=(), usb=(), interest-cohort=()')
        self.end_headers()
    
    def do_GET(self):
        """Retorna el estado de configuración"""
        
        # Obtener variables de entorno
        CF_API_TOKEN = os.getenv("CF_API_TOKEN", "")
        CF_ZONE_ID = os.getenv("CF_ZONE_ID", "")
        TURNSTILE_SECRET_KEY = os.getenv("TURNSTILE_SECRET_KEY", "")
        
        # Determinar el modo
        has_cloudflare_config = bool(CF_API_TOKEN and CF_ZONE_ID)
        mode = "REAL" if has_cloudflare_config else "SIMULACIÓN"
        
        # Construir respuesta
        response = {
            "modo_actual": mode,
            "configuracion": {
                "CF_API_TOKEN": {
                    "configurado": bool(CF_API_TOKEN),
                    "longitud": len(CF_API_TOKEN) if CF_API_TOKEN else 0
                },
                "CF_ZONE_ID": {
                    "configurado": bool(CF_ZONE_ID),
                    "longitud": len(CF_ZONE_ID) if CF_ZONE_ID else 0
                },
                "TURNSTILE_SECRET_KEY": {
                    "configurado": bool(TURNSTILE_SECRET_KEY),
                    "longitud": len(TURNSTILE_SECRET_KEY) if TURNSTILE_SECRET_KEY else 0
                }
            },
            "estado": {
                "puede_validar_turnstile": bool(TURNSTILE_SECRET_KEY),
                "puede_aplicar_proteccion_real": has_cloudflare_config,
                "modo_simulacion_activo": not has_cloudflare_config
            },
            "instrucciones": self._get_instrucciones(has_cloudflare_config, bool(TURNSTILE_SECRET_KEY))
        }
        
        self._set_headers(200)
        self.wfile.write(json.dumps(response, indent=2, ensure_ascii=False).encode('utf-8'))
    
    def _get_instrucciones(self, has_cf, has_turnstile):
        """Genera instrucciones basadas en la configuración actual"""
        instrucciones = []
        
        if not has_turnstile:
            instrucciones.append({
                "prioridad": "ALTA",
                "variable": "TURNSTILE_SECRET_KEY",
                "accion": "Configurar Cloudflare Turnstile Secret Key",
                "pasos": [
                    "1. Ve a https://dash.cloudflare.com",
                    "2. Selecciona tu sitio",
                    "3. Ve a Turnstile",
                    "4. Crea un widget o usa uno existente",
                    "5. Copia el Secret Key",
                    "6. Agrégalo en Vercel → Settings → Environment Variables"
                ]
            })
        
        if not has_cf:
            instrucciones.append({
                "prioridad": "CRÍTICA",
                "variable": "CF_API_TOKEN y CF_ZONE_ID",
                "accion": "Configurar credenciales de Cloudflare para activar protección REAL",
                "pasos": [
                    "=== Para CF_API_TOKEN ===",
                    "1. Ve a https://dash.cloudflare.com/profile/api-tokens",
                    "2. Click en 'Create Token'",
                    "3. Usa plantilla 'Edit zone DNS' o crea custom con permisos:",
                    "   - Zone:Read",
                    "   - Zone Settings:Edit",
                    "   - DNS:Edit",
                    "   - Firewall Services:Edit",
                    "4. Copia el token generado",
                    "",
                    "=== Para CF_ZONE_ID ===",
                    "1. Ve a https://dash.cloudflare.com",
                    "2. Selecciona tu dominio",
                    "3. En la barra lateral derecha, busca 'Zone ID'",
                    "4. Copia el Zone ID",
                    "",
                    "=== Configurar en Vercel ===",
                    "1. Ve a tu proyecto en Vercel",
                    "2. Settings → Environment Variables",
                    "3. Agrega CF_API_TOKEN y CF_ZONE_ID",
                    "4. Click en 'Save'",
                    "5. IMPORTANTE: Redeploy el proyecto"
                ]
            })
        
        if has_cf and has_turnstile:
            instrucciones.append({
                "prioridad": "INFO",
                "mensaje": "✅ Todas las credenciales están configuradas correctamente",
                "estado": "El servicio está en MODO REAL y aplicará protección perimetral real de Cloudflare"
            })
        
        return instrucciones
