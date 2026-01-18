import requests
import json
import os
import sys

# --- CONFIGURACIÓN (Simulación de Variables de Entorno para la Tesis) ---
# En producción, estas variables vendrían de tu orquestador CAS o un archivo .env
CF_API_TOKEN = os.getenv("CF_API_TOKEN", "TU_TOKEN_AQUI")
CF_ZONE_ID = os.getenv("CF_ZONE_ID", "TU_ZONE_ID_AQUI")
CF_ACCOUNT_ID = os.getenv("CF_ACCOUNT_ID", "TU_ACCOUNT_ID_AQUI")

# Configuración del sitio objetivo (puede venir desde argumentos de línea de comandos)
import argparse

# Si se pasan URLs desde la línea de comandos, usarlas
# Formato esperado: python cloudflare_protect.py "url1.com,url2.com"
parser = argparse.ArgumentParser(description='Configurar protección perimetral Cloudflare')
parser.add_argument('urls', nargs='?', help='URLs separadas por comas (ej: url1.com,url2.com)')
args = parser.parse_args()

if args.urls:
    # Parsear las URLs desde argumentos
    TARGET_URLS = [url.strip() for url in args.urls.split(',') if url.strip()]
else:
    # Valores por defecto para testing
    TARGET_URLS = ["app.midominio.com"]

class CloudflareEdgeProtector:
    def __init__(self, token, zone_id):
        self.base_url = "https://api.cloudflare.com/client/v4"
        self.zone_id = zone_id
        self.headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }

    def _log(self, message, level="INFO"):
        """Helper simple para logging."""
        print(f"[{level}] {message}")

    def _request(self, method, endpoint, data=None):
        """Wrapper para realizar peticiones HTTP a la API."""
        url = f"{self.base_url}/{endpoint}"
        try:
            response = requests.request(method, url, headers=self.headers, json=data)
            response.raise_for_status() # Lanza error si status es 4xx o 5xx
            return response.json()
        except requests.exceptions.HTTPError as err:
            self._log(f"Error HTTP: {err}", "ERROR")
            # Imprimir detalle del error de Cloudflare si existe
            if err.response.content:
                print(json.dumps(err.response.json(), indent=2))
            return None

    def configure_dns_proxy(self, name, content, record_type="A"):
        """
        1. Crea o actualiza un registro DNS.
        2. Activa el Proxy de Cloudflare (Nube Naranja) para ocultar la IP de origen.
        """
        self._log(f"Configurando DNS para {name} -> {content} ({record_type})...")
        
        # Primero, buscamos si el registro ya existe
        params = f"?name={name}&type={record_type}"
        search_res = self._request("GET", f"zones/{self.zone_id}/dns_records{params}")
        
        payload = {
            "type": record_type,
            "name": name,
            "content": content,
            "proxied": True, # CRÍTICO: Activa la protección perimetral (CDN/WAF/DDoS)
            "ttl": 1 # Automático
        }

        if search_res and search_res.get("result"):
            # Actualizar existente
            record_id = search_res["result"][0]["id"]
            res = self._request("PUT", f"zones/{self.zone_id}/dns_records/{record_id}", payload)
            action = "actualizado"
        else:
            # Crear nuevo
            res = self._request("POST", f"zones/{self.zone_id}/dns_records", payload)
            action = "creado"

        if res and res.get("success"):
            self._log(f"Registro DNS {action} exitosamente con Proxy activado.")
        else:
            self._log("Fallo en configuración DNS.", "ERROR")

    def configure_ssl_strict(self):
        """
        Configura SSL/TLS en modo Full (Strict).
        Requisito: El servidor origen debe tener un certificado válido (aunque sea de Let's Encrypt o Cloudflare Origin CA).
        """
        self._log("Configurando modo SSL a Full (Strict)...")
        payload = {"value": "strict"}
        res = self._request("PATCH", f"zones/{self.zone_id}/settings/ssl", payload)
        
        if res and res.get("success"):
            self._log("Modo SSL configurado a Full (Strict).")
        else:
            self._log("Fallo al configurar SSL.", "ERROR")

    def enable_https_force_redirect(self):
        """
        Fuerza la redirección de HTTP a HTTPS a nivel de Edge.
        """
        self._log("Activando 'Always Use HTTPS'...")
        payload = {"value": "on"}
        res = self._request("PATCH", f"zones/{self.zone_id}/settings/always_use_https", payload)
        
        if res and res.get("success"):
            self._log("Redirección HTTPS forzada activada.")

    def enable_security_features(self):
        """
        1. Activa el motor WAF básico.
        2. Configura el nivel de seguridad (DDoS sensitivity).
        3. Activa mitigaciones automáticas (Browser Integrity Check).
        """
        self._log("Optimizando configuraciones de Seguridad y DDoS...")
        
        # 1. Activar WAF globalmente
        self._request("PATCH", f"zones/{self.zone_id}/settings/waf", {"value": "on"})
        
        # 2. Browser Integrity Check (Defensa básica capa 7 contra bots malos)
        self._request("PATCH", f"zones/{self.zone_id}/settings/browser_integrity_check", {"value": "on"})
        
        # 3. Security Level (Determina la sensibilidad del desafío CAPTCHA/DDoS)
        # "high" es recomendado para sitios en producción bajo amenaza potencial.
        res = self._request("PATCH", f"zones/{self.zone_id}/settings/security_level", {"value": "high"})
        
        if res and res.get("success"):
            self._log("WAF y protecciones DDoS base configuradas.")

    def create_firewall_custom_rule(self):
        """
        Crea una regla de firewall personalizada (WAF Custom Rule).
        Ejemplo: Bloquear tráfico de un país específico (ej. XX) O User-Agents sospechosos.
        """
        self._log("Implementando Regla de Firewall Personalizada (Capa 7)...")
        
        # Usamos el endpoint de Rulesets (el estándar moderno para WAF Custom Rules)
        # Phase: http_request_firewall_custom
        
        # Definimos la expresión lógica (Filter Expression)
        # Bloquear si viene de 'XX' (país desconocido/ejemplo) O el User-Agent contiene 'python-requests' (ejemplo didáctico)
        expression = '(ip.geoip.country eq "XX") or (http.user_agent contains "BadBot")'
        
        payload = {
            "rules": [
                {
                    "action": "block",
                    "expression": expression,
                    "description": "CAS Auto-Block: GeoIP and Bad Bots",
                    "enabled": True
                }
            ]
        }

        # NOTA: Para simplificar la tesis, usamos el endpoint de 'rulesets' a nivel de zona.
        # Primero necesitamos obtener el ID del ruleset de "custom rules" de la zona.
        # Sin embargo, un método más directo para scripts simples es usar el endpoint de filtros/reglas legacy 
        # o crear un ruleset nuevo. Aquí usaremos el método directo de creación en el "default custom ruleset".
        
        # Para garantizar que funcione en una cuenta nueva sin buscar IDs complejos,
        # usaremos el endpoint `firewall/rules` (aunque está en migración, es el más didáctico para una tesis 
        # sin entrar en la complejidad de los Rulesets IDs globales).
        
        legacy_payload = [
            {
                "filter": {
                    "expression": expression,
                    "paused": False
                },
                "action": "block",
                "description": "CAS Auto-Provisioned Block Rule"
            }
        ]
        
        res = self._request("POST", f"zones/{self.zone_id}/firewall/rules", legacy_payload)
        
        if res and res.get("success"):
            self._log("Regla de Firewall creada correctamente.")
        else:
            self._log("Nota: Si falla por 'deprecated', se debe implementar via Ruleset API (fase http_request_firewall_custom).", "WARN")

    def run_provisioning(self, dns_name, origin_ip):
        self._log("=== INICIANDO PROVISIÓN DE SEGURIDAD PERIMETRAL CAS ===")
        
        # 1. Perímetro de Red (DNS + Proxy)
        self.configure_dns_proxy(dns_name, origin_ip)
        
        # 2. Cifrado y Transporte (SSL/HTTPS)
        self.configure_ssl_strict()
        self.enable_https_force_redirect()
        
        # 3. Seguridad de Aplicación (WAF/DDoS)
        self.enable_security_features()
        self.create_firewall_custom_rule()
        
        self._log("=== PROVISIÓN COMPLETADA EXITOSAMENTE ===")

# --- EJECUCIÓN DEL SCRIPT ---
if __name__ == "__main__":
    # Validación básica
    if not CF_API_TOKEN:
        print("Error: Falta CF_API_TOKEN en las variables de entorno.")
        sys.exit(1)
    
    if not CF_ZONE_ID:
        print("Error: Falta CF_ZONE_ID en las variables de entorno.")
        sys.exit(1)

    if not TARGET_URLS:
        print("Error: No se proporcionaron URLs para proteger.")
        sys.exit(1)

    # Instanciar el orquestador
    automator = CloudflareEdgeProtector(CF_API_TOKEN, CF_ZONE_ID)
    
    # Procesar cada URL proporcionada
    print(f"[INFO] Procesando {len(TARGET_URLS)} URL(s): {', '.join(TARGET_URLS)}")
    
    for url in TARGET_URLS:
        # Extraer el dominio de la URL (ej: https://app.midominio.com -> app.midominio.com)
        domain = url.replace("https://", "").replace("http://", "").split("/")[0]
        
        # Por ahora usamos una IP genérica. En producción, esto debería venir de un DNS lookup o configuración
        ORIGIN_IP = "203.0.113.10"  # IP del servidor real (Origen)
        # TODO: Implementar resolución DNS o lectura desde configuración
        
        print(f"\n[INFO] Configurando protección para: {domain}")
        automator.run_provisioning(domain, ORIGIN_IP)