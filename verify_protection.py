#!/usr/bin/env python3
"""
Script de Verificación de Protección Perimetral
Verifica que todas las protecciones de Cloudflare estén activas
"""
import requests
import json
import os
import sys
from dotenv import load_dotenv

load_dotenv()

CF_API_TOKEN = os.getenv("CF_API_TOKEN")
CF_ZONE_ID = os.getenv("CF_ZONE_ID")

if not CF_API_TOKEN or not CF_ZONE_ID:
    print("❌ Error: CF_API_TOKEN y CF_ZONE_ID deben estar configurados")
    sys.exit(1)

BASE_URL = "https://api.cloudflare.com/client/v4"
HEADERS = {
    "Authorization": f"Bearer {CF_API_TOKEN}",
    "Content-Type": "application/json"
}

def check_mark(condition):
    return "✅" if condition else "❌"

def verify_dns_proxy(domain):
    """Verifica que el DNS tenga proxy activado"""
    print(f"\n🔍 Verificando DNS Proxy para {domain}...")
    
    url = f"{BASE_URL}/zones/{CF_ZONE_ID}/dns_records?name={domain}&type=A"
    response = requests.get(url, headers=HEADERS)
    
    if response.status_code == 200:
        data = response.json()
        if data.get("result"):
            record = data["result"][0]
            proxied = record.get("proxied", False)
            print(f"  {check_mark(proxied)} Proxy (Nube Naranja): {'Activado' if proxied else 'Desactivado'}")
            return proxied
    
    print("  ❌ No se pudo verificar DNS")
    return False

def verify_ssl_settings():
    """Verifica configuración SSL/TLS"""
    print("\n🔍 Verificando SSL/TLS...")
    
    url = f"{BASE_URL}/zones/{CF_ZONE_ID}/settings/ssl"
    response = requests.get(url, headers=HEADERS)
    
    if response.status_code == 200:
        data = response.json()
        ssl_mode = data.get("result", {}).get("value", "")
        is_strict = ssl_mode == "strict"
        print(f"  {check_mark(is_strict)} Modo SSL: {ssl_mode}")
        return is_strict
    
    print("  ❌ No se pudo verificar SSL")
    return False

def verify_https_redirect():
    """Verifica Always Use HTTPS"""
    print("\n🔍 Verificando Always Use HTTPS...")
    
    url = f"{BASE_URL}/zones/{CF_ZONE_ID}/settings/always_use_https"
    response = requests.get(url, headers=HEADERS)
    
    if response.status_code == 200:
        data = response.json()
        enabled = data.get("result", {}).get("value", "") == "on"
        print(f"  {check_mark(enabled)} Always Use HTTPS: {'Activado' if enabled else 'Desactivado'}")
        return enabled
    
    print("  ❌ No se pudo verificar HTTPS redirect")
    return False

def verify_waf():
    """Verifica WAF"""
    print("\n🔍 Verificando WAF...")
    
    url = f"{BASE_URL}/zones/{CF_ZONE_ID}/settings/waf"
    response = requests.get(url, headers=HEADERS)
    
    if response.status_code == 200:
        data = response.json()
        enabled = data.get("result", {}).get("value", "") == "on"
        print(f"  {check_mark(enabled)} WAF: {'Activado' if enabled else 'Desactivado'}")
        return enabled
    
    print("  ❌ No se pudo verificar WAF")
    return False

def verify_security_level():
    """Verifica Security Level"""
    print("\n🔍 Verificando Security Level...")
    
    url = f"{BASE_URL}/zones/{CF_ZONE_ID}/settings/security_level"
    response = requests.get(url, headers=HEADERS)
    
    if response.status_code == 200:
        data = response.json()
        level = data.get("result", {}).get("value", "")
        is_high = level == "high"
        print(f"  {check_mark(is_high)} Security Level: {level}")
        return is_high
    
    print("  ❌ No se pudo verificar Security Level")
    return False

def verify_firewall_rules():
    """Verifica Firewall Rules"""
    print("\n🔍 Verificando Firewall Rules...")
    
    url = f"{BASE_URL}/zones/{CF_ZONE_ID}/firewall/rules"
    response = requests.get(url, headers=HEADERS)
    
    if response.status_code == 200:
        data = response.json()
        rules = data.get("result", [])
        cas_rules = [r for r in rules if "CAS Auto-Provisioned" in r.get("description", "")]
        
        print(f"  {check_mark(len(cas_rules) > 0)} Reglas CAS: {len(cas_rules)} encontrada(s)")
        
        for rule in cas_rules:
            print(f"    - {rule.get('description')}")
            print(f"      Acción: {rule.get('action')}")
            print(f"      Estado: {'Activa' if not rule.get('paused') else 'Pausada'}")
        
        return len(cas_rules) > 0
    
    print("  ❌ No se pudo verificar Firewall Rules")
    return False

def verify_nameservers():
    """Verifica Nameservers"""
    print("\n🔍 Verificando Nameservers...")
    
    url = f"{BASE_URL}/zones/{CF_ZONE_ID}"
    response = requests.get(url, headers=HEADERS)
    
    if response.status_code == 200:
        data = response.json()
        nameservers = data.get("result", {}).get("name_servers", [])
        
        print(f"  {check_mark(len(nameservers) > 0)} Nameservers asignados:")
        for ns in nameservers:
            print(f"    - {ns}")
        
        return len(nameservers) > 0
    
    print("  ❌ No se pudo verificar Nameservers")
    return False

def main():
    print("=" * 60)
    print("🛡️  VERIFICACIÓN DE PROTECCIÓN PERIMETRAL CLOUDFLARE")
    print("=" * 60)
    
    # Obtener dominio de la zona
    url = f"{BASE_URL}/zones/{CF_ZONE_ID}"
    response = requests.get(url, headers=HEADERS)
    
    if response.status_code != 200:
        print("❌ Error: No se pudo acceder a la zona de Cloudflare")
        sys.exit(1)
    
    zone_data = response.json()
    domain = zone_data.get("result", {}).get("name", "unknown")
    
    print(f"\n📍 Zona: {domain}")
    print(f"🆔 Zone ID: {CF_ZONE_ID}")
    
    # Ejecutar verificaciones
    results = {
        "DNS Proxy": verify_dns_proxy(domain),
        "SSL/TLS Strict": verify_ssl_settings(),
        "Always Use HTTPS": verify_https_redirect(),
        "WAF": verify_waf(),
        "Security Level High": verify_security_level(),
        "Firewall Rules": verify_firewall_rules(),
        "Nameservers": verify_nameservers()
    }
    
    # Resumen
    print("\n" + "=" * 60)
    print("📊 RESUMEN DE VERIFICACIÓN")
    print("=" * 60)
    
    total = len(results)
    passed = sum(1 for v in results.values() if v)
    
    for name, status in results.items():
        print(f"  {check_mark(status)} {name}")
    
    print("\n" + "-" * 60)
    print(f"  Protecciones activas: {passed}/{total}")
    
    if passed == total:
        print("\n✅ ¡TODAS LAS PROTECCIONES ESTÁN ACTIVAS!")
    elif passed >= total * 0.7:
        print("\n⚠️  La mayoría de protecciones están activas")
    else:
        print("\n❌ Varias protecciones no están activas")
    
    print("=" * 60)
    
    return 0 if passed == total else 1

if __name__ == "__main__":
    sys.exit(main())
