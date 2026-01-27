#!/usr/bin/env python3
"""
Demo del Sistema CSaaS
Muestra cómo provisionar un cliente de ejemplo
"""
import sys
import os
import json
import time

# Agregar el directorio api al path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'api'))

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    print("⚠️ python-dotenv no instalado")

from config import CF_API_TOKEN, CF_ZONE_ID


def demo_provision_client():
    """Demo: Provisionar un cliente de ejemplo"""
    print("\n" + "="*60)
    print("DEMO: Provisionamiento de Cliente CSaaS")
    print("="*60)
    
    if not CF_API_TOKEN or not CF_ZONE_ID:
        print("\n⚠️ Credenciales no configuradas")
        print("Este es un demo simulado sin conexión real a Cloudflare\n")
        simulate = True
    else:
        print("\n✓ Credenciales configuradas")
        print("Ejecutando demo real con Cloudflare API\n")
        simulate = False
    
    # Datos del cliente de ejemplo
    client_data = {
        "client_name": "Demo Corporation",
        "client_id": "DEMO-001",
        "urls": ["app.democorp.com", "api.democorp.com"]
    }
    
    print("📋 Datos del Cliente:")
    print(f"  • Nombre: {client_data['client_name']}")
    print(f"  • ID: {client_data['client_id']}")
    print(f"  • URLs a proteger:")
    for url in client_data['urls']:
        print(f"    - {url}")
    
    if simulate:
        print("\n🔄 Simulando provisionamiento...")
        time.sleep(1)
        
        # Simular respuesta
        subdomain = "democorporation-abc12345.suncarsrl.com"
        protected_url = f"https://{subdomain}"
        
        print("\n✅ Provisionamiento Simulado Completado")
        print(f"\n🌐 URL Protegida: {protected_url}")
        print(f"📊 Subdominio: {subdomain}")
        print(f"🔒 SSL/TLS: Activo")
        print(f"🛡️ Protecciones:")
        print(f"  ✓ WAF Activado")
        print(f"  ✓ HTTPS Redirect")
        print(f"  ✓ Security Level: High")
        print(f"  ✓ Bot Fight Mode")
        print(f"  ✓ Browser Integrity Check")
        print(f"  ✓ Rate Limiting")
        
        print(f"\n📝 Próximos Pasos:")
        print(f"  1. Comparte la URL protegida con tu cliente")
        print(f"  2. El cliente puede acceder a través de: {protected_url}")
        print(f"  3. Todo el tráfico estará protegido por Cloudflare")
        print(f"  4. No se requieren cambios en el DNS del cliente")
        
    else:
        print("\n🔄 Provisionando cliente real...")
        print("⚠️ Esto creará recursos reales en Cloudflare")
        
        response = input("\n¿Continuar? (s/n): ")
        if response.lower() != 's':
            print("❌ Demo cancelado")
            return
        
        try:
            import urllib.request
            
            # Llamar al endpoint de provisionamiento
            url = "http://localhost:5173/api/csaas-provision"
            headers = {"Content-Type": "application/json"}
            data = json.dumps(client_data).encode('utf-8')
            
            req = urllib.request.Request(url, data=data, headers=headers, method='POST')
            
            print("\n📡 Enviando solicitud al API...")
            with urllib.request.urlopen(req, timeout=300) as response:
                result = json.loads(response.read().decode('utf-8'))
            
            if result.get("status") == "ok":
                print("\n✅ Provisionamiento Completado")
                print(f"\n🌐 URL Protegida: {result['protected_url']}")
                print(f"📊 Subdominio: {result['subdomain']}")
                print(f"🔑 Custom Hostname ID: {result['custom_hostname_id']}")
                print(f"\n🛡️ Reglas de Seguridad:")
                for rule, status in result.get('security_rules', {}).items():
                    icon = "✓" if status else "✗"
                    print(f"  {icon} {rule}")
                
                print(f"\n📝 Logs:")
                for log in result.get('logs', [])[:10]:
                    print(f"  {log}")
                
            else:
                print(f"\n❌ Error: {result.get('message')}")
                
        except Exception as e:
            print(f"\n❌ Error: {str(e)}")
            print("\n💡 Asegúrate de que el servidor esté corriendo:")
            print("   npm run dev")


def demo_list_clients():
    """Demo: Listar clientes provisionados"""
    print("\n" + "="*60)
    print("DEMO: Listar Clientes CSaaS")
    print("="*60)
    
    if not CF_API_TOKEN or not CF_ZONE_ID:
        print("\n⚠️ Credenciales no configuradas")
        print("Este es un demo simulado\n")
        
        # Datos simulados
        clients = [
            {
                "hostname": "democorporation-abc12345.suncarsrl.com",
                "status": "active",
                "ssl_status": "active",
                "created_at": "2026-01-27T10:30:00Z"
            },
            {
                "hostname": "testclient-def67890.suncarsrl.com",
                "status": "active",
                "ssl_status": "active",
                "created_at": "2026-01-27T11:45:00Z"
            }
        ]
        
        print(f"📊 Clientes Provisionados: {len(clients)}\n")
        for i, client in enumerate(clients, 1):
            print(f"{i}. {client['hostname']}")
            print(f"   Status: {client['status']}")
            print(f"   SSL: {client['ssl_status']}")
            print(f"   Creado: {client['created_at']}\n")
        
    else:
        try:
            import urllib.request
            
            url = "http://localhost:5173/api/csaas-list"
            req = urllib.request.Request(url, method='GET')
            
            print("\n📡 Consultando clientes...")
            with urllib.request.urlopen(req, timeout=30) as response:
                result = json.loads(response.read().decode('utf-8'))
            
            if result.get("status") == "ok":
                clients = result.get("clients", [])
                print(f"\n📊 Clientes Provisionados: {len(clients)}\n")
                
                if not clients:
                    print("  No hay clientes provisionados aún")
                else:
                    for i, client in enumerate(clients, 1):
                        print(f"{i}. {client['hostname']}")
                        print(f"   Status: {client['status']}")
                        print(f"   SSL: {client['ssl_status']}")
                        print(f"   Creado: {client['created_at']}\n")
            else:
                print(f"\n❌ Error: {result.get('message')}")
                
        except Exception as e:
            print(f"\n❌ Error: {str(e)}")


def main():
    """Menú principal del demo"""
    print("\n" + "="*60)
    print("SISTEMA CSaaS - DEMO INTERACTIVO")
    print("="*60)
    
    while True:
        print("\n📋 Opciones:")
        print("  1. Provisionar cliente de ejemplo")
        print("  2. Listar clientes provisionados")
        print("  3. Salir")
        
        choice = input("\nSelecciona una opción (1-3): ")
        
        if choice == "1":
            demo_provision_client()
        elif choice == "2":
            demo_list_clients()
        elif choice == "3":
            print("\n👋 ¡Hasta luego!")
            break
        else:
            print("\n❌ Opción inválida")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n👋 Demo interrumpido por el usuario")
        sys.exit(0)
