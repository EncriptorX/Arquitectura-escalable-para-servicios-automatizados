#!/usr/bin/env python3
"""
Script de diagnóstico para Cloudflare for SaaS
Verifica si el sistema está correctamente configurado
"""
import sys
import os
import json
import urllib.request
import urllib.error

# Agregar el directorio api al path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'api'))

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

from config import CF_API_TOKEN, CF_ZONE_ID, CSAAS_ZONE, CSAAS_CNAME_TARGET


def check_cloudflare_for_saas():
    """Verifica si Cloudflare for SaaS está habilitado"""
    print("\n" + "="*60)
    print("DIAGNÓSTICO: Cloudflare for SaaS")
    print("="*60)
    
    if not CF_API_TOKEN or not CF_ZONE_ID:
        print("\n✗ Credenciales no configuradas")
        return False
    
    try:
        # Intentar crear un Custom Hostname de prueba (sin realmente crearlo)
        # Primero, listar Custom Hostnames existentes
        url = f"https://api.cloudflare.com/client/v4/zones/{CF_ZONE_ID}/custom_hostnames"
        headers = {
            "Authorization": f"Bearer {CF_API_TOKEN}",
            "Content-Type": "application/json"
        }
        
        req = urllib.request.Request(url, headers=headers, method='GET')
        
        print(f"\n📡 Consultando Custom Hostnames en zona {CF_ZONE_ID}...")
        
        try:
            with urllib.request.urlopen(req, timeout=10) as response:
                result = json.loads(response.read().decode('utf-8'))
            
            if result.get("success"):
                custom_hostnames = result.get("result", [])
                print(f"✓ Cloudflare for SaaS está HABILITADO")
                print(f"✓ Custom Hostnames existentes: {len(custom_hostnames)}")
                
                if custom_hostnames:
                    print(f"\n📋 Custom Hostnames actuales:")
                    for ch in custom_hostnames[:5]:  # Mostrar solo los primeros 5
                        print(f"  • {ch['hostname']} - Status: {ch['status']}")
                
                return True
            else:
                errors = result.get("errors", [])
                print(f"✗ Error consultando Custom Hostnames")
                for error in errors:
                    print(f"  • [{error.get('code')}] {error.get('message')}")
                return False
                
        except urllib.error.HTTPError as e:
            error_body = None
            try:
                error_body = json.loads(e.read().decode('utf-8'))
            except:
                pass
            
            print(f"✗ Error HTTP {e.code}: {e.reason}")
            
            if error_body:
                errors = error_body.get("errors", [])
                for error in errors:
                    code = error.get("code")
                    message = error.get("message")
                    print(f"  • [{code}] {message}")
                    
                    # Detectar errores específicos
                    if code == 1003:  # Forbidden
                        print(f"\n⚠️ DIAGNÓSTICO:")
                        print(f"  Tu API Token no tiene permisos para Custom Hostnames")
                        print(f"  Verifica que tenga: SSL and Certificates:Edit")
                    elif code == 1004:  # Not found
                        print(f"\n⚠️ DIAGNÓSTICO:")
                        print(f"  Cloudflare for SaaS NO está habilitado en tu zona")
                        print(f"  Necesitas:")
                        print(f"  1. Plan Business o superior")
                        print(f"  2. Contactar a Cloudflare Support para habilitar CSaaS")
                    elif "not entitled" in message.lower() or "not available" in message.lower():
                        print(f"\n⚠️ DIAGNÓSTICO:")
                        print(f"  Cloudflare for SaaS NO está disponible en tu plan")
                        print(f"  Requiere plan Business o superior")
            
            return False
            
    except Exception as e:
        print(f"✗ Error: {str(e)}")
        return False


def check_zone_plan():
    """Verifica el plan de la zona"""
    print("\n" + "="*60)
    print("DIAGNÓSTICO: Plan de Cloudflare")
    print("="*60)
    
    if not CF_API_TOKEN or not CF_ZONE_ID:
        print("\n✗ Credenciales no configuradas")
        return False
    
    try:
        url = f"https://api.cloudflare.com/client/v4/zones/{CF_ZONE_ID}"
        headers = {
            "Authorization": f"Bearer {CF_API_TOKEN}",
            "Content-Type": "application/json"
        }
        
        req = urllib.request.Request(url, headers=headers, method='GET')
        
        print(f"\n📡 Consultando información de la zona...")
        
        with urllib.request.urlopen(req, timeout=10) as response:
            result = json.loads(response.read().decode('utf-8'))
        
        if result.get("success"):
            zone = result["result"]
            plan = zone.get("plan", {})
            plan_name = plan.get("name", "Unknown")
            
            print(f"✓ Zona: {zone['name']}")
            print(f"✓ Plan: {plan_name}")
            print(f"✓ Estado: {zone['status']}")
            
            # Verificar si el plan soporta CSaaS
            if plan_name.lower() in ["free", "pro"]:
                print(f"\n⚠️ ADVERTENCIA:")
                print(f"  Tu plan ({plan_name}) NO soporta Cloudflare for SaaS")
                print(f"  Necesitas plan Business o superior")
                return False
            elif plan_name.lower() in ["business", "enterprise"]:
                print(f"\n✓ Tu plan ({plan_name}) SOPORTA Cloudflare for SaaS")
                return True
            else:
                print(f"\n⚠️ Plan desconocido: {plan_name}")
                print(f"  Verifica con Cloudflare Support si soporta CSaaS")
                return None
        else:
            print(f"✗ Error consultando zona")
            return False
            
    except Exception as e:
        print(f"✗ Error: {str(e)}")
        return False


def check_api_token_permissions():
    """Verifica los permisos del API Token"""
    print("\n" + "="*60)
    print("DIAGNÓSTICO: Permisos del API Token")
    print("="*60)
    
    if not CF_API_TOKEN:
        print("\n✗ API Token no configurado")
        return False
    
    try:
        url = "https://api.cloudflare.com/client/v4/user/tokens/verify"
        headers = {
            "Authorization": f"Bearer {CF_API_TOKEN}",
            "Content-Type": "application/json"
        }
        
        req = urllib.request.Request(url, headers=headers, method='GET')
        
        print(f"\n📡 Verificando API Token...")
        
        with urllib.request.urlopen(req, timeout=10) as response:
            result = json.loads(response.read().decode('utf-8'))
        
        if result.get("success"):
            token_info = result["result"]
            print(f"✓ API Token válido")
            print(f"✓ Estado: {token_info['status']}")
            
            # Nota: La API no devuelve los permisos específicos en verify
            print(f"\n📋 Permisos requeridos para CSaaS:")
            print(f"  • Zone:Read")
            print(f"  • Zone Settings:Edit")
            print(f"  • DNS:Edit")
            print(f"  • SSL and Certificates:Edit")
            print(f"  • Firewall Services:Edit")
            print(f"\n💡 Verifica estos permisos en:")
            print(f"   https://dash.cloudflare.com/profile/api-tokens")
            
            return True
        else:
            print(f"✗ API Token inválido")
            return False
            
    except Exception as e:
        print(f"✗ Error: {str(e)}")
        return False


def check_cname_target():
    """Verifica el CNAME target"""
    print("\n" + "="*60)
    print("DIAGNÓSTICO: CNAME Target")
    print("="*60)
    
    if not CF_API_TOKEN or not CF_ZONE_ID:
        print("\n✗ Credenciales no configuradas")
        return False
    
    try:
        url = f"https://api.cloudflare.com/client/v4/zones/{CF_ZONE_ID}/dns_records?name={CSAAS_CNAME_TARGET}"
        headers = {
            "Authorization": f"Bearer {CF_API_TOKEN}",
            "Content-Type": "application/json"
        }
        
        req = urllib.request.Request(url, headers=headers, method='GET')
        
        print(f"\n📡 Buscando CNAME target: {CSAAS_CNAME_TARGET}...")
        
        with urllib.request.urlopen(req, timeout=10) as response:
            result = json.loads(response.read().decode('utf-8'))
        
        if result.get("success"):
            records = result.get("result", [])
            if records:
                record = records[0]
                print(f"✓ CNAME target encontrado")
                print(f"  • Tipo: {record['type']}")
                print(f"  • Contenido: {record['content']}")
                print(f"  • Proxied: {record['proxied']}")
                return True
            else:
                print(f"⚠️ CNAME target NO encontrado")
                print(f"  El sistema lo creará automáticamente durante el provisionamiento")
                return None
        else:
            print(f"✗ Error consultando DNS")
            return False
            
    except Exception as e:
        print(f"✗ Error: {str(e)}")
        return False


def main():
    """Ejecutar diagnóstico completo"""
    print("\n" + "="*60)
    print("DIAGNÓSTICO COMPLETO - CLOUDFLARE FOR SAAS")
    print("="*60)
    
    results = []
    
    # 1. Verificar plan
    plan_ok = check_zone_plan()
    results.append(("Plan de Cloudflare", plan_ok))
    
    # 2. Verificar permisos
    token_ok = check_api_token_permissions()
    results.append(("Permisos del API Token", token_ok))
    
    # 3. Verificar CSaaS habilitado
    csaas_ok = check_cloudflare_for_saas()
    results.append(("Cloudflare for SaaS", csaas_ok))
    
    # 4. Verificar CNAME target
    cname_ok = check_cname_target()
    results.append(("CNAME Target", cname_ok))
    
    # Resumen
    print("\n" + "="*60)
    print("RESUMEN DEL DIAGNÓSTICO")
    print("="*60)
    
    for name, result in results:
        if result is True:
            status = "✓ OK"
        elif result is False:
            status = "✗ ERROR"
        else:
            status = "⚠️ ADVERTENCIA"
        print(f"{status:15s} {name}")
    
    # Conclusión
    print("\n" + "="*60)
    
    if all(r is True or r is None for r in [r for _, r in results]):
        print("✅ SISTEMA LISTO PARA USAR")
        print("\nPuedes provisionar clientes CSaaS sin problemas.")
        return 0
    elif csaas_ok is False:
        print("❌ CLOUDFLARE FOR SAAS NO ESTÁ HABILITADO")
        print("\n📋 Pasos para habilitar:")
        print("  1. Verifica que tu plan sea Business o superior")
        print("  2. Contacta a Cloudflare Support:")
        print("     - Email: support@cloudflare.com")
        print("     - Dashboard: https://dash.cloudflare.com > Support")
        print("  3. Solicita habilitar 'Cloudflare for SaaS'")
        print("  4. Espera confirmación (puede tomar 1-2 días hábiles)")
        return 1
    else:
        print("⚠️ HAY PROBLEMAS QUE RESOLVER")
        print("\nRevisa los errores arriba y corrígelos antes de usar el sistema.")
        return 1


if __name__ == "__main__":
    sys.exit(main())
