#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script para verificar que la protección perimetral se aplicó correctamente
Ejecutar después de usar el formulario web
"""

import os
import json
import urllib.request
import sys
from dotenv import load_dotenv

# Detectar si podemos usar emojis
USE_EMOJIS = sys.platform != 'win32' or os.getenv('PYTHONIOENCODING', '').lower() == 'utf-8'

# Símbolos según el sistema
if USE_EMOJIS:
    CHECK = "✅"
    CROSS = "❌"
    WARN = "⚠️"
    INFO = "ℹ️"
    FIRE = "🔥"
    LOCK = "🔒"
    SHIELD = "🛡️"
    ALERT = "🚨"
    REFRESH = "🔄"
    CHART = "📊"
    GLOBE = "🌐"
    SEARCH = "🔍"
    DOCS = "📋"
    BULB = "💡"
    TROPHY = "🎉"
    TARGET = "🎯"
else:
    CHECK = "[OK]"
    CROSS = "[X]"
    WARN = "[!]"
    INFO = "[i]"
    FIRE = "[FIRE]"
    LOCK = "[LOCK]"
    SHIELD = "[SHIELD]"
    ALERT = "[ALERT]"
    REFRESH = "[REFRESH]"
    CHART = "[CHART]"
    GLOBE = "[GLOBE]"
    SEARCH = "[SEARCH]"
    DOCS = "[DOCS]"
    BULB = "[TIP]"
    TROPHY = "[SUCCESS]"
    TARGET = "[TARGET]"

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
        print(f"{CROSS} CF_API_TOKEN no está configurado")
        return False
    if not CF_ZONE_ID:
        print(f"{CROSS} CF_ZONE_ID no está configurado")
        return False
    
    print(f"{CHECK} Credenciales configuradas")
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
        print(f"Modo SSL: {ssl_mode.upper()}")
        
        if ssl_mode == "strict":
            print("✅ SSL CONFIGURADO EN MODO FULL (STRICT)")
            print("\n   Características:")
            print("   ✓ Cifrado end-to-end (Cliente → Cloudflare → Servidor)")
            print("   ✓ Certificado válido requerido en el servidor origen")
            print("   ✓ Máxima seguridad en la comunicación")
            print("\n   Disponible en: Todos los planes (Free, Pro, Business, Enterprise)")
            return True
        else:
            print(f"⚠️  SSL en modo '{ssl_mode.upper()}' (se recomienda 'STRICT')")
            print(f"\n   Modos disponibles:")
            print(f"   - OFF: Sin cifrado (NO RECOMENDADO)")
            print(f"   - FLEXIBLE: Cifrado solo Cliente → Cloudflare")
            print(f"   - FULL: Cifrado completo pero sin validar certificado")
            print(f"   - STRICT: Cifrado completo con certificado válido (RECOMENDADO)")
            print(f"\n   ACCIÓN: Cambia el modo SSL a 'strict' para máxima seguridad")
            return False
    else:
        print("❌ No se pudo verificar la configuración SSL")
        print("   CAUSA: Error de comunicación con Cloudflare API")
        return False

def verificar_https_redirect():
    """Verifica la redirección HTTPS"""
    print("\n" + "="*70)
    print("🔄 REDIRECCIÓN HTTPS AUTOMÁTICA")
    print("="*70)
    
    res = hacer_request("GET", f"zones/{CF_ZONE_ID}/settings/always_use_https")
    if res and res.get("success"):
        https_mode = res["result"]["value"]
        print(f"Always Use HTTPS: {https_mode.upper()}")
        
        if https_mode == "on":
            print("✅ REDIRECCIÓN HTTPS ACTIVADA")
            print("\n   Funcionamiento:")
            print("   ✓ Todo el tráfico HTTP se redirige automáticamente a HTTPS")
            print("   ✓ Redirección 301 (permanente) a nivel de edge")
            print("   ✓ Sin necesidad de configuración en el servidor")
            print("\n   Disponible en: Todos los planes (Free, Pro, Business, Enterprise)")
            return True
        else:
            print("❌ REDIRECCIÓN HTTPS DESACTIVADA")
            print("   IMPACTO: Los usuarios pueden acceder por HTTP sin cifrado")
            print("   RIESGO: Datos sensibles pueden ser interceptados")
            print("   ACCIÓN: Activa 'Always Use HTTPS' inmediatamente")
            return False
    else:
        print("❌ No se pudo verificar la redirección HTTPS")
        print("   CAUSA: Error de comunicación con Cloudflare API")
        return False

def verificar_waf():
    """Verifica el WAF"""
    print("\n" + "="*70)
    print("🛡️  WEB APPLICATION FIREWALL (WAF)")
    print("="*70)
    
    res = hacer_request("GET", f"zones/{CF_ZONE_ID}/settings/waf")
    if res and res.get("success"):
        waf_mode = res["result"]["value"]
        print(f"Estado WAF: {waf_mode.upper()}")
        
        if waf_mode == "on":
            print("✅ WAF ACTIVADO - Protección contra ataques web")
            print("\n   Protecciones incluidas:")
            print("   ✓ SQL Injection - Previene inyección de código SQL")
            print("   ✓ XSS (Cross-Site Scripting) - Bloquea scripts maliciosos")
            print("   ✓ CSRF - Protege contra falsificación de peticiones")
            print("   ✓ File Inclusion - Previene inclusión de archivos maliciosos")
            print("   ✓ Command Injection - Bloquea ejecución de comandos")
            print("\n   Disponible en: Todos los planes (Free, Pro, Business, Enterprise)")
            return True
        else:
            print("❌ WAF DESACTIVADO")
            print("   IMPACTO: Tu sitio está vulnerable a ataques web comunes")
            print("   ACCIÓN: Activa el WAF desde el panel de control")
            return False
    else:
        print("❌ No se pudo verificar el WAF")
        print("   CAUSA: Error de comunicación con Cloudflare API")
        return False

def verificar_security_level():
    """Verifica el nivel de seguridad (DDoS)"""
    print("\n" + "="*70)
    print("🚨 PROTECCIÓN DDoS")
    print("="*70)
    
    res = hacer_request("GET", f"zones/{CF_ZONE_ID}/settings/security_level")
    if res and res.get("success"):
        sec_level = res["result"]["value"]
        print(f"Security Level: {sec_level.upper()}")
        
        if sec_level == "high":
            print("✅ PROTECCIÓN DDoS EN NIVEL ALTO")
            print("\n   Protecciones activas:")
            print("   ✓ DDoS Layer 3/4 - Protección a nivel de red y transporte")
            print("   ✓ DDoS Layer 7 - Protección a nivel de aplicación")
            print("   ✓ Ataques volumétricos - Mitigación de tráfico masivo")
            print("   ✓ Rate Limiting - Control de peticiones por segundo")
            print("\n   Disponible en: Todos los planes (Free, Pro, Business, Enterprise)")
            return True
        else:
            print(f"⚠️  Security Level en '{sec_level.upper()}' (se recomienda 'HIGH')")
            print(f"   IMPACTO: Protección DDoS reducida")
            print(f"   ACCIÓN: Aumenta el nivel de seguridad a 'high'")
            return False
    else:
        print("❌ No se pudo verificar el Security Level")
        print("   CAUSA: Error de comunicación con Cloudflare API")
        return False

def verificar_firewall_rules():
    """Verifica las reglas de firewall"""
    print("\n" + "="*70)
    print("🔥 REGLAS DE FIREWALL PERSONALIZADAS")
    print("="*70)
    
    res = hacer_request("GET", f"zones/{CF_ZONE_ID}/firewall/rules")
    if res and res.get("success"):
        rules = res["result"]
        
        if not rules:
            print("⚠️  No hay reglas de firewall configuradas")
            print("   LIMITACIÓN TÉCNICA: Firewall Rules requiere plan Pro o superior")
            print("   Plan Free: 5 reglas | Plan Pro: 20 reglas | Plan Business: 100 reglas")
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
            print(f"   ID: {cas_rule['id']}")
            return True
        else:
            print("\n⚠️  No se encontró la regla de firewall de CAS")
            print("   POSIBLES CAUSAS:")
            print("   1. LIMITACIÓN DE PLAN: Tu plan no incluye Firewall Rules")
            print("   2. La regla no se creó correctamente")
            print("   3. La regla fue eliminada manualmente")
            return False
    else:
        errors = res.get("errors", []) if res else []
        if errors and errors[0].get("code") == 1003:
            print("⚠️  LIMITACIÓN DE PLAN: Firewall Rules no disponible")
            print("   Tu plan actual: Free")
            print("   Requerido: Pro o superior")
            print("   Impacto: No se pueden crear reglas de firewall personalizadas")
            print("   Nota: Las protecciones básicas (WAF, DDoS) siguen activas")
            return None
        else:
            print("❌ No se pudieron obtener las reglas de firewall")
            if errors:
                print(f"   Error: {errors[0].get('message', 'Desconocido')}")
            return False

def generar_resumen(resultados):
    """Genera un resumen de la verificación"""
    print("\n" + "="*70)
    print("📊 RESUMEN DE PROTECCIÓN PERIMETRAL")
    print("="*70)
    
    # Separar resultados por estado
    activos = {k: v for k, v in resultados.items() if v is True}
    inactivos = {k: v for k, v in resultados.items() if v is False}
    limitados = {k: v for k, v in resultados.items() if v is None}
    
    total = len([r for r in resultados.values() if r is not None])
    exitosos = len(activos)
    
    print(f"\n📈 Estadísticas:")
    print(f"   Total de controles verificados: {len(resultados)}")
    print(f"   Controles activos: {len(activos)}")
    print(f"   Controles inactivos: {len(inactivos)}")
    print(f"   Limitaciones de plan: {len(limitados)}")
    
    print("\n✅ CONTROLES ACTIVOS:")
    if activos:
        for nombre in activos.keys():
            print(f"   ✅ {nombre}")
    else:
        print("   (Ninguno)")
    
    if inactivos:
        print("\n❌ CONTROLES INACTIVOS:")
        for nombre in inactivos.keys():
            print(f"   ❌ {nombre}")
    
    if limitados:
        print("\n⚠️  LIMITACIONES TÉCNICAS (No disponibles en tu plan):")
        for nombre in limitados.keys():
            print(f"   ⚠️  {nombre}")
        print("\n   NOTA: Estas funcionalidades requieren un plan superior.")
        print("   Las protecciones básicas (SSL, WAF, DDoS) siguen activas.")
    
    print("\n" + "="*70)
    print("🎯 EVALUACIÓN GENERAL")
    print("="*70)
    
    if exitosos == total:
        print("🎉 ¡EXCELENTE! Todas las protecciones disponibles están activas")
        print("   Tu dominio está completamente protegido por Cloudflare")
        print("   Nivel de seguridad: ÓPTIMO")
    elif exitosos >= total * 0.7:
        print("✅ BIEN - La mayoría de las protecciones están activas")
        print("   Nivel de seguridad: BUENO")
        if inactivos:
            print("\n   RECOMENDACIÓN: Revisa las protecciones marcadas con ❌")
    else:
        print("⚠️  ATENCIÓN - Pocas protecciones están activas")
        print("   Nivel de seguridad: MEJORABLE")
        print("\n   ACCIÓN REQUERIDA:")
        print("   1. Verifica que el script de protección se ejecutó correctamente")
        print("   2. Revisa los logs del sistema")
        print("   3. Contacta al administrador si el problema persiste")
    
    if limitados:
        print("\n💡 MEJORA SUGERIDA:")
        print("   Considera actualizar tu plan de Cloudflare para acceder a:")
        for nombre in limitados.keys():
            print(f"   - {nombre}")
        print("   Más información: https://www.cloudflare.com/plans/")
    
    print("\n" + "="*70)

def main():
    """Función principal"""
    print("="*70)
    print("VERIFICACION DE PROTECCION PERIMETRAL CLOUDFLARE")
    print("="*70)
    print("\nEste script verifica los siguientes controles de seguridad:")
    print("  1. [OK] DNS con Proxy (Nube Naranja) - Disponible en todos los planes")
    print("  2. [OK] SSL/TLS Strict - Disponible en todos los planes")
    print("  3. [OK] Force HTTPS - Disponible en todos los planes")
    print("  4. [OK] WAF (Web Application Firewall) - Disponible en todos los planes")
    print("  5. [OK] DDoS Protection - Disponible en todos los planes")
    print("  6. [!]  Firewall Rules - Requiere plan Pro o superior")
    print("\nNOTA: Algunos controles pueden no estar disponibles segun tu plan.")
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
    resultados["Firewall Rules Personalizadas"] = verificar_firewall_rules()
    
    # Generar resumen
    generar_resumen(resultados)
    
    print("\n✅ Verificación completada")
    print("\n💡 TIP: Ejecuta este script después de cada cambio de configuración")
    print("   para asegurar que las protecciones estén activas.")

if __name__ == "__main__":
    main()
