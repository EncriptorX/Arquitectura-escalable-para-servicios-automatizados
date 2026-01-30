#!/usr/bin/env python3
"""
Script de Diagnóstico - Verificar Configuración de Subdominio
Verifica la configuración DNS de un subdominio en Cloudflare
"""
import os
import sys
import json
import urllib.request
import urllib.error

# Colores
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
RESET = '\033[0m'

def print_header(text):
    print(f"\n{BLUE}{'='*60}{RESET}")
    print(f"{BLUE}{text:^60}{RESET}")
    print(f"{BLUE}{'='*60}{RESET}\n")

def print_success(text):
    print(f"{GREEN}✓{RESET} {text}")

def print_error(text):
    print(f"{RED}✗{RESET} {text}")

def print_warning(text):
    print(f"{YELLOW}⚠{RESET} {text}")

def print_info(text):
    print(f"{BLUE}ℹ{RESET} {text}")

def get_dns_records(zone_id, api_token, subdomain=None):
    """Obtiene registros DNS de Cloudflare"""
    url = f"https://api.cloudflare.com/client/v4/zones/{zone_id}/dns_records"
    if subdomain:
        url += f"?name={subdomain}"
    
    headers = {
        "Authorization": f"Bearer {api_token}",
        "Content-Type": "application/json"
    }
    
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=10) as response:
            return json.loads(response.read().decode('utf-8'))
    except Exception as e:
        print_error(f"Error consultando Cloudflare API: {str(e)}")
        return None

def diagnose_subdomain(subdomain, zone_id, api_token):
    """Diagnostica la configuración de un subdominio"""
    print_header(f"DIAGNÓSTICO: {subdomain}")
    
    # Obtener registros DNS
    print_info("Consultando registros DNS en Cloudflare...")
    result = get_dns_records(zone_id, api_token, subdomain)
    
    if not result or not result.get("success"):
        print_error("No se pudo obtener información de Cloudflare")
        if result:
            errors = result.get("errors", [])
            for error in errors:
                print_error(f"  {error.get('message', 'Error desconocido')}")
        return False
    
    records = result.get("result", [])
    
    if not records:
        print_error(f"No se encontró el subdominio '{subdomain}' en Cloudflare")
        print_warning("El subdominio no existe o no se ha propagado")
        return False
    
    # Analizar cada registro
    for record in records:
        print_success(f"Registro encontrado: {record['name']}")
        print(f"\n  Tipo: {record['type']}")
        print(f"  Destino: {record['content']}")
        print(f"  Proxy: {'✅ Activado' if record['proxied'] else '❌ Desactivado'}")
        print(f"  TTL: {record['ttl']}")
        
        # Verificar configuración
        print("\n  Verificación:")
        
        # 1. Tipo de registro
        if record['type'] == 'CNAME':
            print_success("  ✓ Tipo CNAME correcto")
        else:
            print_warning(f"  ⚠ Tipo {record['type']} (esperado: CNAME)")
        
        # 2. Proxy activado
        if record['proxied']:
            print_success("  ✓ Proxy de Cloudflare activado")
        else:
            print_error("  ✗ Proxy de Cloudflare NO activado")
            print_warning("    Solución: Activar la nube naranja en Cloudflare Dashboard")
        
        # 3. Destino
        target = record['content']
        print(f"\n  Destino: {target}")
        
        # Verificar si apunta a Vercel
        if 'vercel' in target.lower() or 'cname.vercel-dns.com' in target.lower():
            print_error("  ✗ Apunta a Vercel (incorrecto para CNAME directo)")
            print_warning("    El CNAME debe apuntar al dominio del cliente, no a Vercel")
        elif 'cubansaas.tech' in target and target != subdomain:
            print_warning(f"  ⚠ Apunta a otro subdominio de cubansaas.tech: {target}")
            print_info("    Esto puede causar loops o errores")
        else:
            print_success(f"  ✓ Apunta al dominio del cliente: {target}")
        
        # 4. Verificar si el destino es accesible
        print(f"\n  Verificando accesibilidad del destino...")
        try:
            test_url = f"https://{target}"
            req = urllib.request.Request(test_url, method='HEAD')
            req.add_header('User-Agent', 'Mozilla/5.0')
            with urllib.request.urlopen(req, timeout=10) as response:
                print_success(f"  ✓ Destino accesible (HTTP {response.status})")
        except urllib.error.HTTPError as e:
            if e.code in [200, 301, 302, 403]:
                print_success(f"  ✓ Destino accesible (HTTP {e.code})")
            else:
                print_warning(f"  ⚠ Destino retorna HTTP {e.code}")
        except Exception as e:
            print_error(f"  ✗ Destino no accesible: {str(e)}")
            print_warning("    El dominio del cliente puede estar caído o no existir")
    
    return True

def main():
    print_header("DIAGNÓSTICO DE SUBDOMINIOS CSAAS")
    
    # Obtener credenciales
    api_token = os.getenv("CF_API_TOKEN")
    zone_id = os.getenv("CF_ZONE_ID")
    
    if not api_token or not zone_id:
        print_error("Faltan credenciales de Cloudflare")
        print_info("Configura las variables de entorno:")
        print("  CF_API_TOKEN=tu_token")
        print("  CF_ZONE_ID=tu_zone_id")
        sys.exit(1)
    
    # Obtener subdominio a diagnosticar
    if len(sys.argv) > 1:
        subdomain = sys.argv[1]
    else:
        print_info("Uso: python diagnosticar_subdominio.py <subdominio>")
        print("Ejemplo: python diagnosticar_subdominio.py testclient-abc123.cubansaas.tech")
        print("\nO presiona Enter para listar todos los subdominios...")
        input()
        
        # Listar todos los subdominios
        print_header("LISTANDO TODOS LOS SUBDOMINIOS")
        result = get_dns_records(zone_id, api_token)
        
        if result and result.get("success"):
            records = result.get("result", [])
            csaas_records = [r for r in records if 'cubansaas.tech' in r['name'] and r['name'] != 'cubansaas.tech']
            
            if csaas_records:
                print(f"Encontrados {len(csaas_records)} subdominios:\n")
                for i, record in enumerate(csaas_records, 1):
                    proxy_icon = "🟠" if record['proxied'] else "⚪"
                    print(f"{i}. {proxy_icon} {record['name']}")
                    print(f"   → {record['content']}")
                    print()
                
                # Preguntar cuál diagnosticar
                try:
                    choice = int(input("Ingresa el número del subdominio a diagnosticar (0 para salir): "))
                    if choice == 0:
                        sys.exit(0)
                    if 1 <= choice <= len(csaas_records):
                        subdomain = csaas_records[choice - 1]['name']
                    else:
                        print_error("Número inválido")
                        sys.exit(1)
                except ValueError:
                    print_error("Entrada inválida")
                    sys.exit(1)
            else:
                print_warning("No se encontraron subdominios CSaaS")
                sys.exit(0)
        else:
            print_error("No se pudo obtener la lista de subdominios")
            sys.exit(1)
    
    # Diagnosticar el subdominio
    success = diagnose_subdomain(subdomain, zone_id, api_token)
    
    if success:
        print_header("RECOMENDACIONES")
        print("1. Verifica que el CNAME apunte al dominio del cliente")
        print("2. Asegúrate de que el proxy esté activado (nube naranja)")
        print("3. Verifica que el dominio del cliente sea accesible")
        print("4. Espera 5-15 minutos para propagación DNS")
        print("5. Configura SSL en modo 'Flexible' si el origen no tiene SSL")
    
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()
