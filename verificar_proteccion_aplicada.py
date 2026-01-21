#!/usr/bin/env python3
"""
Script para verificar que la protección perimetral se aplicó correctamente
Ejecutar después de usar el formulario web
"""

import os
import json
import urllib.request
import sys
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv()

CF_API_TOKEN = os.getenv("CF_API_TOKEN", "")
CF_ZONE_ID = os.getenv("CF_ZONE_ID", "")

def hacer_request(method, endpoint, data=None):
    """Hace una petición a la API de Cloudflare"""
    url = f"https://api.cloudflare.com/client/v4/{endpoint}"
    headers = {
        "Authorization": f"Bearer {CF_API_TOKEN}",
        "Content-Type": "application/json"
    }
    
    try:
        data_encoded = json.dumps(data).encode('utf-8') if data else None
        req = urllib.request.Request(url, data=data_encoded, headers=headers, method=method)
        
        with urllib.request.urlopen(req, timeout=10) as response:
            return json.loads(response.read().decode('utf-8'))
    except Exception as e:
        print(f"❌ Error: {e}")
        return None

def verificar_credenciales():
    """Verifica que las credenciales estén configuradas"""
    if not CF_API_TOKEN:
        print("❌ CF_API_TOKEN no está configurado")
        return False
    if not CF_ZONE_ID:
        print("❌ CF_ZONE_ID no está configurado")
        return False
    
    print("✅ Credenciales configuradas")
    return True

def obtener_info_zona():
    """Obtiene información de la zona"""
    print("\n" + "="*70)
    print("📋 INFORMACIÓN DE LA ZONA")
    print("="*70)
    
    res = hacer_request("GET", f"zones/{CF_ZONE_ID}")
    if res and res.get("success"):
        zona = res["result"]
        print(f"✅ Zona: {zona['name']}")
        print(f"   Status: {zona['status']}")
        print(f"   Plan: {zona['plan']['name']}")
        print(f"   Nameservers:")
        for ns in zona.get("name_servers", []):
            print(f"      - {ns}")
        return zona['name']
    else:
        print("❌ No se pudo obtener información de la zona")
        return None

def verificar_registros_dns(dominio_buscar=None):
    """Verifica los registros DNS"""
    print("\n" + "="*70)
    print("🌐 REGISTROS DNS")
    print("="*70)
    
    res = hacer_request("GET", f"zones/{CF_ZONE_ID}/dns_records")
    if res and res.get("success"):
        records = res["result"]
        
        if not records:
            print("⚠️  No hay registros DNS configurados")
            return False
        
        encontrado = False
        for record in records:
            # Si se especifica un dominio, solo mostrar ese
            if dominio_buscar and record['name'] != dominio_buscar:
                continue
            
            encontrado = True
            proxy_icon = "🟠" if record.get("proxied") else "⚪"
            proxy_text = "PROXIED (Protegido)" if record.get("proxied") else "DNS Only (Sin protección)"
            
            print(f"\n{proxy_icon} {record['name']}")
            print(f"   Tipo: {record['type']}")
            print(f"   Apunta a: {record['content']}")
            print(f"   Estado: {proxy_text}")
            print(f"   TTL: {record['ttl']}")
            
            if record.get("proxied"):
                print(f"   ✅ Este dominio ESTÁ PROTEGIDO por Cloudflare")
            else:
                print(f"   ⚠️  Este dominio NO está protegido (proxy desactivado)")
        
        if dominio_buscar and not encontrado:
            print(f"⚠️  No se encontró el dominio '{dominio_buscar}'")
            print(f"   Esto puede significar que:")
            print(f"   1. El dominio no se procesó correctamente")
            print(f"   2. El dominio no pertenece a esta zona")
            print(f"   3. Hubo un error al crear el registro")
            return False
        
        return encontrado
    else:
        print("❌ No se pudieron obtener los registros DNS")
        return False

def verificar_ssl():
    """Verifica la configuración SSL/TLS"""
    print("\n" + "="*70)
    print("🔒 CONFIGURACIÓN SSL/TLS")
    print("="*70)
    
    res = hacer_request("GET", f"zones/{CF_ZONE_ID}/settings/ssl")
    if res and res.get("success"):
        ssl_mode = res["result"]["value"]
        print(f"Modo SSL: {ssl_mode}")
        
        if ssl_mode == "strict":
            print("✅ SSL configurado correctamente en modo Full (Strict)")
            print("   Esto significa cifrado end-to-end")
            return True
        else:
            print(f"⚠️  SSL está en modo '{ssl_mode}' (se esperaba 'strict')")
            return False
    else:
        print("❌ No se pudo verificar la configuración SSL")
        return False

def verificar_https_redirect():
    """Verifica la redirección HTTPS"""
    print("\n" + "="*70)
    print("🔄 REDIRECCIÓN HTTPS")
    print("="*70)
    
    res = hacer_request("GET", f"zones/{CF_ZONE_ID}/settings/always_use_https")
    if res and res.get("success"):
        https_mode = res["result"]["value"]
        print(f"Always Use HTTPS: {https_mode}")
        
        if https_mode == "on":
            print("✅ Redirección HTTPS activada")
            print("   Todo el tráfico HTTP se redirige automáticamente a HTTPS")
            return True
        else:
            print("⚠️  Redirección HTTPS desactivada")
            return False
    else:
        print("❌ No se pudo verificar la redirección HTTPS")
        return False

def verificar_waf():
    """Verifica el WAF"""
    print("\n" + "="*70)
    print("🛡️  WEB APPLICATION FIREWALL (WAF)")
    print("="*70)
    
    res = hacer_request("GET", f"zones/{CF_ZONE_ID}/settings/waf")
    if res and res.get("success"):
        waf_mode = res["result"]["value"]
        print(f"WAF: {waf_mode}")
        
        if waf_mode == "on":
            print("✅ WAF activado")
            print("   Protección contra ataques OWASP Top 10:")
            print("   - SQL Injection")
            print("   - XSS (Cross-Site Scripting)")
            print("   - CSRF")
            print("   - File Inclusion")
            print("   - Command Injection")
            return True
        else:
            print("⚠️  WAF desactivado")
            return False
    else:
        print("❌ No se pudo verificar el WAF")
        return False

def verificar_security_level():
    """Verifica el nivel de seguridad (DDoS)"""
    print("\n" + "="*70)
    print("🚨 PROTECCIÓN DDoS")
    print("="*70)
    
    res = hacer_request("GET", f"zones/{CF_ZONE_ID}/settings/security_level")
    if res and res.get("success"):
        sec_level = res["result"]["value"]
        print(f"Security Level: {sec_level}")
        
        if sec_level == "high":
            print("✅ Protección DDoS en nivel ALTO")
            print("   Protección contra:")
            print("   - Ataques DDoS Layer 3/4 (Network/Transport)")
            print("   - Ataques DDoS Layer 7 (Application)")
            print("   - Ataques volumétricos")
            return True
        else:
            print(f"⚠️  Security Level está en '{sec_level}' (se esperaba 'high')")
            return False
    else:
        print("❌ No se pudo verificar el Security Level")
        return False

def verificar_firewall_rules():
    """Verifica las reglas de firewall"""
    print("\n" + "="*70)
    print("🔥 REGLAS DE FIREWALL")
    print("="*70)
    
    res = hacer_request("GET", f"zones/{CF_ZONE_ID}/firewall/rules")
    if res and res.get("success"):
        rules = res["result"]
        
        if not rules:
            print("⚠️  No hay reglas de firewall configuradas")
            print("   Esto puede ser normal si tu plan no incluye Firewall Rules")
            return None
        
        print(f"Total de reglas: {len(rules)}")
        
        # Buscar la regla creada por el script
        cas_rule = None
        for rule in rules:
            if "CAS Auto-Provisioned" in rule.get("description", ""):
                cas_rule = rule
                break
        
        if cas_rule:
            print(f"\n✅ Regla de CAS encontrada:")
            print(f"   Descripción: {cas_rule['description']}")
            print(f"   Acción: {cas_rule['action']}")
            print(f"   Estado: {'Activa' if not cas_rule.get('paused') else 'Pausada'}")
            return True
        else:
            print("\n⚠️  No se encontró la regla de firewall de CAS")
            print("   Esto puede significar que:")
            print("   1. Tu plan no incluye Firewall Rules")
            print("   2. La regla no se creó correctamente")
            return False
    else:
        errors = res.get("errors", []) if res else []
        if errors and errors[0].get("code") == 1003:
            print("⚠️  Firewall Rules no disponible en tu plan")
            print("   Esto es normal en el plan Free")
            return None
        else:
            print("❌ No se pudieron obtener las reglas de firewall")
            return False

def generar_resumen(resultados):
    """Genera un resumen de la verificación"""
    print("\n" + "="*70)
    print("📊 RESUMEN DE PROTECCIÓN PERIMETRAL")
    print("="*70)
    
    total = len([r for r in resultados.values() if r is not None])
    exitosos = len([r for r in resultados.values() if r is True])
    
    print(f"\nProtecciones verificadas: {exitosos}/{total}")
    print("\nEstado por protección:")
    
    for nombre, resultado in resultados.items():
        if resultado is True:
            print(f"   ✅ {nombre}")
        elif resultado is False:
            print(f"   ❌ {nombre}")
        elif resultado is None:
            print(f"   ⚠️  {nombre} (No disponible en tu plan)")
    
    print("\n" + "="*70)
    
    if exitosos == total:
        print("🎉 ¡EXCELENTE! Todas las protecciones están activas")
        print("Tu dominio está completamente protegido por Cloudflare")
    elif exitosos >= total * 0.7:
        print("✅ BIEN - La mayoría de las protecciones están activas")
        print("Revisa las protecciones marcadas con ❌ para mejorar la seguridad")
    else:
        print("⚠️  ATENCIÓN - Pocas protecciones están activas")
        print("Verifica que el script se haya ejecutado correctamente")

def main():
    """Función principal"""
    print("="*70)
    print("🔍 VERIFICACIÓN DE PROTECCIÓN PERIMETRAL CLOUDFLARE")
    print("="*70)
    
    # Verificar credenciales
    if not verificar_credenciales():
        print("\n❌ Configura las credenciales en el archivo .env")
        sys.exit(1)
    
    # Obtener info de la zona
    zone_name = obtener_info_zona()
    if not zone_name:
        sys.exit(1)
    
    # Preguntar por el dominio a verificar
    print(f"\n¿Qué dominio deseas verificar?")
    print(f"Ejemplos: {zone_name}, app.{zone_name}, api.{zone_name}")
    dominio = input("Dominio (Enter para ver todos): ").strip()
    
    if not dominio:
        dominio = None
    
    # Verificar cada protección
    resultados = {}
    
    resultados["DNS con Proxy"] = verificar_registros_dns(dominio)
    resultados["SSL/TLS Strict"] = verificar_ssl()
    resultados["Force HTTPS"] = verificar_https_redirect()
    resultados["WAF"] = verificar_waf()
    resultados["DDoS Protection"] = verificar_security_level()
    resultados["Firewall Rules"] = verificar_firewall_rules()
    
    # Generar resumen
    generar_resumen(resultados)
    
    print("\n✅ Verificación completada")

if __name__ == "__main__":
    main()
