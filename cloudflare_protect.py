import requests
import json
import os
import re
import sys
import argparse

CF_API_TOKEN = os.getenv("CF_API_TOKEN", "")
CF_ZONE_ID = os.getenv("CF_ZONE_ID", "")

parser = argparse.ArgumentParser(description='Configurar protección perimetral Cloudflare')
parser.add_argument('urls', nargs='?', help='URLs separadas por comas')
args = parser.parse_args()

TARGET_URLS = [url.strip() for url in args.urls.split(',') if url.strip()] if args.urls else []

class CloudflareEdgeProtector:
    def __init__(self, token, zone_id):
        self.base_url = "https://api.cloudflare.com/client/v4"
        self.zone_id = zone_id
        self.headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }

    def validate_domain(self, domain):
        """Valida formato DNS válido (sin esquema ni ruta)."""
        pattern = r"^(?=.{1,253}$)(?!-)([A-Za-z0-9-]{1,63}(?<!-)\.)+[A-Za-z]{2,63}$"
        return bool(re.match(pattern, domain))

    def fetch_zone_nameservers(self):
        """Obtiene los nameservers asignados por Cloudflare."""
        res = self._request("GET", f"zones/{self.zone_id}")
        if res and res.get("success"):
            return res["result"].get("name_servers", [])
        self._log("No se pudieron obtener nameservers", "WARN")
        return []

    def show_dns_delegation_instructions(self, domain):
        """Imprime instrucciones de delegación DNS."""
        nameservers = self.fetch_zone_nameservers()
        if nameservers:
            print(f"\n[INFO] Instrucciones DNS para '{domain}':")
            print("  1) Ve al registrador del dominio")
            print("  2) Sustituye los nameservers por:")
            for ns in nameservers:
                print(f"     - {ns}")
            print("  3) Espera propagación (minutos a horas)")
        else:
            print("\n[WARN] No se encontraron nameservers")

    def _log(self, message, level="INFO"):
        """Helper para logging."""
        print(f"[{level}] {message}")

    def _request(self, method, endpoint, data=None):
        """Wrapper para peticiones HTTP a la API."""
        url = f"{self.base_url}/{endpoint}"
        try:
            response = requests.request(method, url, headers=self.headers, json=data, timeout=30)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.HTTPError as err:
            self._log(f"Error HTTP: {err}", "ERROR")
            if err.response.content:
                try:
                    print(json.dumps(err.response.json(), indent=2))
                except:
                    pass
            return None
        except requests.exceptions.Timeout:
            self._log("Timeout en request a Cloudflare API", "ERROR")
            return None

    def configure_dns_proxy(self, name, content, record_type="A"):
        """Crea o actualiza registro DNS con Proxy activado."""
        self._log(f"Configurando DNS: {name} -> {content} ({record_type})")
        
        search_res = self._request("GET", f"zones/{self.zone_id}/dns_records?name={name}&type={record_type}")
        
        payload = {
            "type": record_type,
            "name": name,
            "content": content,
            "proxied": True,
            "ttl": 1
        }

        if search_res and search_res.get("result"):
            record_id = search_res["result"][0]["id"]
            res = self._request("PUT", f"zones/{self.zone_id}/dns_records/{record_id}", payload)
            action = "actualizado"
        else:
            res = self._request("POST", f"zones/{self.zone_id}/dns_records", payload)
            action = "creado"

        if res and res.get("success"):
            self._log(f"DNS {action} con Proxy activado")
        else:
            self._log("Fallo en configuración DNS", "ERROR")

    def configure_ssl_strict(self):
        """Configura SSL/TLS en modo Full (Strict)."""
        self._log("Configurando SSL Full (Strict)")
        res = self._request("PATCH", f"zones/{self.zone_id}/settings/ssl", {"value": "strict"})
        
        if res and res.get("success"):
            self._log("SSL configurado correctamente")
        else:
            self._log("Fallo al configurar SSL", "ERROR")

    def enable_https_force_redirect(self):
        """Fuerza redirección HTTP a HTTPS."""
        self._log("Activando Always Use HTTPS")
        res = self._request("PATCH", f"zones/{self.zone_id}/settings/always_use_https", {"value": "on"})
        
        if res and res.get("success"):
            self._log("Redirección HTTPS activada")

    def enable_security_features(self):
        """Activa WAF y configuraciones de seguridad DDoS."""
        self._log("Configurando seguridad y DDoS")
        
        self._request("PATCH", f"zones/{self.zone_id}/settings/waf", {"value": "on"})
        res = self._request("PATCH", f"zones/{self.zone_id}/settings/security_level", {"value": "high"})
        
        if res and res.get("success"):
            self._log("WAF y DDoS configurados")

    def create_firewall_custom_rule(self):
        """Crea regla de firewall personalizada."""
        self._log("Implementando regla de Firewall")
        
        expression = '(ip.geoip.country eq "XX") or (http.user_agent contains "BadBot")'
        
        payload = [{
            "filter": {
                "expression": expression,
                "paused": False
            },
            "action": "block",
            "description": "CAS Auto-Provisioned Block Rule"
        }]
        
        res = self._request("POST", f"zones/{self.zone_id}/firewall/rules", payload)
        
        if res and res.get("success"):
            self._log("Regla de Firewall creada")
        else:
            self._log("Regla de firewall no creada (puede requerir plan superior)", "WARN")

    def run_provisioning(self, dns_name, origin_ip):
        self._log("=== INICIANDO PROVISIÓN ===")
        
        self.show_dns_delegation_instructions(dns_name)
        self.configure_dns_proxy(dns_name, origin_ip)
        self.configure_ssl_strict()
        self.enable_https_force_redirect()
        self.enable_security_features()
        self.create_firewall_custom_rule()
        
        self._log("=== PROVISIÓN COMPLETADA ===")

if __name__ == "__main__":
    if not CF_API_TOKEN or not CF_ZONE_ID:
        print("Error: Faltan CF_API_TOKEN o CF_ZONE_ID")
        sys.exit(1)

    if not TARGET_URLS:
        print("Error: No se proporcionaron URLs")
        sys.exit(1)

    automator = CloudflareEdgeProtector(CF_API_TOKEN, CF_ZONE_ID)
    print(f"[INFO] Procesando {len(TARGET_URLS)} URL(s)")
    
    for url in TARGET_URLS:
        domain = url.replace("https://", "").replace("http://", "").split("/")[0]

        if not automator.validate_domain(domain):
            print(f"[ERROR] Dominio inválido: {domain}")
            continue
        
        ORIGIN_IP = "203.0.113.10"
        print(f"\n[INFO] Configurando: {domain}")
        automator.run_provisioning(domain, ORIGIN_IP)