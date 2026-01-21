#!/usr/bin/env python3
"""
Script de prueba para verificar que el servicio de protección perimetral
realmente está aplicando configuraciones a Cloudflare.

Uso:
    python test_real_protection.py
"""

import os
import json
import urllib.request
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv()

CF_API_TOKEN = os.getenv("CF_API_TOKEN", "")
CF_ZONE_ID = os.getenv("CF_ZONE_ID", "")

def verificar_credenciales():
    """Verifica que las credenciales estén configuradas"""
    if not CF_API_TOKEN:
        print("❌ ERROR: CF_API_TOKEN no está configurado")
        return False
    if not CF_ZONE_ID:
        print("❌ ERROR: CF_ZONE_ID no está configurado")
        return False
    
    print("✅ Credenciales configuradas")
    print(f"   Token: {CF_API_TOKEN[:10]}...")
    print(f"   Zone ID: {CF_ZONE_ID[:8]}...")
    return True

def verificar_zona():
    """Verifica que la zona existe y es accesible"""
    print("\n🔍 Verificando acceso a la zona...")
    
    url = f"https://api.cloudflare.com/client/v4/zones/{CF_ZONE_ID}"
    headers = {
        "Authorization": f"Bearer {CF_API_TOKEN}",
        "Content-Type": "application/json"
    }
    
    try:
        req = urllib.request.Request(url, headers=headers, method='GET')
        with urllib.request.urlopen(req, timeout=10) as response:
            data = json.loads(response.read().decode('utf-8'))
            
            if data.get("success"):
                zone = data["result"]
                print(f"✅ Zona encontrada: {zone['name']}")
                print(f"   Status: {zone['status']}")
                print(f"   Nameservers: {', '.join(zone.get('name_servers', []))}")
                return True
            else:
                print(f"❌ Error: {data.get('errors')}")
                return False
    except Exception as e:
        print(f"❌ Error conectando con Cloudflare: {str(e)}")
        return False

def verificar_dns_records():
    """Lista los registros DNS actuales"""
    print("\n📋 Registros DNS actuales:")
    
    url = f"https://api.cloudflare.com/client/v4/zones/{CF_ZONE_ID}/dns_records"
    headers = {
        "Authorization": f"Bearer {CF_API_TOKEN}",
        "Content-Type": "application/json"
    }
    
    try:
        req = urllib.request.Request(url, headers=headers, method='GET')
        with urllib.request.urlopen(req, timeout=10) as response:
            data = json.loads(response.read().decode('utf-8'))
            
            if data.get("success"):
                records = data["result"]
                if not records:
                    print("   (No hay registros DNS)")
                else:
                    for record in records:
                        proxy_status = "🟠 Proxied" if record.get("proxied") else "⚪ DNS Only"
                        print(f"   {record['type']:5} {record['name']:30} → {record['content']:20} {proxy_status}")
                return True
            else:
                print(f"❌ Error: {data.get('errors')}")
                return False
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return False

def verificar_configuraciones_seguridad():
    """Verifica las configuraciones de seguridad actuales"""
    print("\n🛡️  Configuraciones de seguridad:")
    
    settings = [
        ("ssl", "SSL/TLS Mode"),
        ("always_use_https", "Always Use HTTPS"),
        ("waf", "WAF"),
        ("security_level", "Security Level")
    ]
    
    for setting_id, setting_name in settings:
        url = f"https://api.cloudflare.com/client/v4/zones/{CF_ZONE_ID}/settings/{setting_id}"
        headers = {
            "Authorization": f"Bearer {CF_API_TOKEN}",
            "Content-Type": "application/json"
        }
        
        try:
            req = urllib.request.Request(url, headers=headers, method='GET')
            with urllib.request.urlopen(req, timeout=10) as response:
                data = json.loads(response.read().decode('utf-8'))
                
                if data.get("success"):
                    value = data["result"]["value"]
                    print(f"   {setting_name:20} → {value}")
                else:
                    print(f"   {setting_name:20} → Error")
        except Exception as e:
            print(f"   {setting_name:20} → Error: {str(e)}")

def verificar_firewall_rules():
    """Lista las reglas de firewall actuales"""
    print("\n🔥 Reglas de Firewall:")
    
    url = f"https://api.cloudflare.com/client/v4/zones/{CF_ZONE_ID}/firewall/rules"
    headers = {
        "Authorization": f"Bearer {CF_API_TOKEN}",
        "Content-Type": "application/json"
    }
    
    try:
        req = urllib.request.Request(url, headers=headers, method='GET')
        with urllib.request.urlopen(req, timeout=10) as response:
            data = json.loads(response.read().decode('utf-8'))
            
            if data.get("success"):
                rules = data["result"]
                if not rules:
                    print("   (No hay reglas de firewall)")
                else:
                    for rule in rules:
                        status = "✅ Activa" if not rule.get("paused") else "⏸️  Pausada"
                        print(f"   {rule['description']:40} → {rule['action']:10} {status}")
                return True
            else:
                errors = data.get("errors", [])
                if errors and errors[0].get("code") == 1003:
                    print("   ⚠️  Firewall Rules no disponible en este plan")
                else:
                    print(f"   ❌ Error: {errors}")
                return False
    except Exception as e:
        print(f"   ❌ Error: {str(e)}")
        return False

def main():
    print("=" * 70)
    print("🔍 VERIFICACIÓN DE PROTECCIÓN PERIMETRAL CLOUDFLARE")
    print("=" * 70)
    
    # Verificar credenciales
    if not verificar_credenciales():
        print("\n❌ Configure las credenciales en el archivo .env")
        return
    
    # Verificar zona
    if not verificar_zona():
        print("\n❌ No se pudo acceder a la zona de Cloudflare")
        return
    
    # Verificar DNS
    verificar_dns_records()
    
    # Verificar seguridad
    verificar_configuraciones_seguridad()
    
    # Verificar firewall
    verificar_firewall_rules()
    
    print("\n" + "=" * 70)
    print("✅ VERIFICACIÓN COMPLETADA")
    print("=" * 70)
    print("\nPara probar el servicio:")
    print("1. Envía una solicitud desde el formulario web")
    print("2. Ejecuta este script nuevamente para ver los cambios")
    print("3. Verifica que los registros DNS tengan 🟠 Proxied")
    print("4. Verifica que las configuraciones de seguridad estén activas")

if __name__ == "__main__":
    main()
