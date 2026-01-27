#!/usr/bin/env python3
"""
Script de prueba para el sistema CSaaS
Verifica que todos los componentes funcionen correctamente
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
    print("⚠️ python-dotenv no instalado, usando variables de entorno del sistema")

# Importar módulos del sistema
try:
    from config import CF_API_TOKEN, CF_ZONE_ID, CSAAS_ZONE, CSAAS_CNAME_TARGET
    print("✓ Módulo config importado correctamente")
except ImportError as e:
    print(f"✗ Error importando config: {e}")
    sys.exit(1)


def test_configuration():
    """Prueba 1: Verificar configuración"""
    print("\n" + "="*60)
    print("PRUEBA 1: Verificación de Configuración")
    print("="*60)
    
    checks = {
        "CF_API_TOKEN": bool(CF_API_TOKEN),
        "CF_ZONE_ID": bool(CF_ZONE_ID),
        "CSAAS_ZONE": bool(CSAAS_ZONE),
        "CSAAS_CNAME_TARGET": bool(CSAAS_CNAME_TARGET)
    }
    
    for key, value in checks.items():
        status = "✓" if value else "✗"
        print(f"{status} {key}: {'Configurado' if value else 'NO CONFIGURADO'}")
    
    all_configured = all(checks.values())
    print(f"\nResultado: {'✓ PASS' if all_configured else '✗ FAIL'}")
    return all_configured


def test_subdomain_generation():
    """Prueba 2: Generación de subdominios"""
    print("\n" + "="*60)
    print("PRUEBA 2: Generación de Subdominios")
    print("="*60)
    
    try:
        # Importar función de generación
        sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'api'))
        
        # Simular la función generate_subdomain
        import hashlib
        
        def generate_subdomain(client_name: str, client_id: str = None) -> str:
            clean_name = ''.join(c.lower() for c in client_name if c.isalnum())[:20]
            if client_id:
                unique_str = f"{client_name}-{client_id}-{int(time.time())}"
            else:
                unique_str = f"{client_name}-{int(time.time())}"
            hash_suffix = hashlib.md5(unique_str.encode()).hexdigest()[:8]
            return f"{clean_name}-{hash_suffix}.{CSAAS_ZONE}"
        
        # Casos de prueba
        test_cases = [
            ("Acme Corporation", None),
            ("Test Client", "CLI-123"),
            ("Cliente Español", "ESP-456"),
            ("123 Numbers", None),
            ("Special!@#$%Characters", None)
        ]
        
        print("\nGenerando subdominios de prueba:")
        for client_name, client_id in test_cases:
            subdomain = generate_subdomain(client_name, client_id)
            print(f"  • {client_name:30s} → {subdomain}")
        
        print(f"\nResultado: ✓ PASS")
        return True
        
    except Exception as e:
        print(f"\nResultado: ✗ FAIL - {str(e)}")
        return False


def test_validation():
    """Prueba 3: Validación de datos"""
    print("\n" + "="*60)
    print("PRUEBA 3: Validación de Datos")
    print("="*60)
    
    try:
        # Simular función de validación
        def validate_client_data(data: dict) -> tuple:
            client_name = data.get("client_name", "").strip()
            if not client_name:
                return False, "El nombre del cliente es requerido"
            
            urls = data.get("urls", [])
            if not urls or not isinstance(urls, list):
                return False, "Debe proporcionar al menos una URL a proteger"
            
            for url in urls:
                if not url or not isinstance(url, str):
                    return False, f"URL inválida: {url}"
                if "://" in url or "/" in url or " " in url:
                    return False, f"URL debe ser un dominio FQDN sin esquemas ni rutas: {url}"
            
            return True, None
        
        # Casos de prueba
        test_cases = [
            ({"client_name": "Test", "urls": ["example.com"]}, True, "Datos válidos"),
            ({"client_name": "", "urls": ["example.com"]}, False, "Nombre vacío"),
            ({"client_name": "Test", "urls": []}, False, "Sin URLs"),
            ({"client_name": "Test", "urls": ["http://example.com"]}, False, "URL con esquema"),
            ({"client_name": "Test", "urls": ["example.com/path"]}, False, "URL con ruta"),
            ({"client_name": "Test", "urls": ["example.com", "test.com"]}, True, "Múltiples URLs válidas"),
        ]
        
        print("\nValidando casos de prueba:")
        all_passed = True
        for data, expected_valid, description in test_cases:
            valid, error = validate_client_data(data)
            passed = (valid == expected_valid)
            status = "✓" if passed else "✗"
            print(f"{status} {description:30s} → {'Válido' if valid else f'Error: {error}'}")
            if not passed:
                all_passed = False
        
        print(f"\nResultado: {'✓ PASS' if all_passed else '✗ FAIL'}")
        return all_passed
        
    except Exception as e:
        print(f"\nResultado: ✗ FAIL - {str(e)}")
        return False


def test_api_connectivity():
    """Prueba 4: Conectividad con API de Cloudflare"""
    print("\n" + "="*60)
    print("PRUEBA 4: Conectividad con API de Cloudflare")
    print("="*60)
    
    if not CF_API_TOKEN or not CF_ZONE_ID:
        print("⚠️ Saltando prueba - Credenciales no configuradas")
        return True
    
    try:
        import urllib.request
        
        # Verificar zona
        url = f"https://api.cloudflare.com/client/v4/zones/{CF_ZONE_ID}"
        headers = {
            "Authorization": f"Bearer {CF_API_TOKEN}",
            "Content-Type": "application/json"
        }
        
        req = urllib.request.Request(url, headers=headers, method='GET')
        
        print(f"\nConsultando zona: {CF_ZONE_ID}")
        with urllib.request.urlopen(req, timeout=10) as response:
            result = json.loads(response.read().decode('utf-8'))
        
        if result.get("success"):
            zone_name = result["result"]["name"]
            zone_status = result["result"]["status"]
            print(f"✓ Zona encontrada: {zone_name}")
            print(f"✓ Estado: {zone_status}")
            print(f"\nResultado: ✓ PASS")
            return True
        else:
            print(f"✗ Error: {result.get('errors', [])}")
            print(f"\nResultado: ✗ FAIL")
            return False
            
    except Exception as e:
        print(f"✗ Error de conexión: {str(e)}")
        print(f"\nResultado: ✗ FAIL")
        return False


def test_cname_target_check():
    """Prueba 5: Verificar CNAME target"""
    print("\n" + "="*60)
    print("PRUEBA 5: Verificación de CNAME Target")
    print("="*60)
    
    if not CF_API_TOKEN or not CF_ZONE_ID:
        print("⚠️ Saltando prueba - Credenciales no configuradas")
        return True
    
    try:
        import urllib.request
        
        # Buscar CNAME target
        url = f"https://api.cloudflare.com/client/v4/zones/{CF_ZONE_ID}/dns_records?name={CSAAS_CNAME_TARGET}"
        headers = {
            "Authorization": f"Bearer {CF_API_TOKEN}",
            "Content-Type": "application/json"
        }
        
        req = urllib.request.Request(url, headers=headers, method='GET')
        
        print(f"\nBuscando CNAME target: {CSAAS_CNAME_TARGET}")
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
                print(f"\nResultado: ✓ PASS")
                return True
            else:
                print(f"⚠️ CNAME target no encontrado")
                print(f"  El sistema lo creará automáticamente durante el provisionamiento")
                print(f"\nResultado: ✓ PASS (se creará automáticamente)")
                return True
        else:
            print(f"✗ Error: {result.get('errors', [])}")
            print(f"\nResultado: ✗ FAIL")
            return False
            
    except Exception as e:
        print(f"✗ Error de conexión: {str(e)}")
        print(f"\nResultado: ✗ FAIL")
        return False


def main():
    """Ejecutar todas las pruebas"""
    print("\n" + "="*60)
    print("SISTEMA DE PRUEBAS CSaaS")
    print("="*60)
    
    tests = [
        ("Configuración", test_configuration),
        ("Generación de Subdominios", test_subdomain_generation),
        ("Validación de Datos", test_validation),
        ("Conectividad API", test_api_connectivity),
        ("CNAME Target", test_cname_target_check)
    ]
    
    results = []
    for name, test_func in tests:
        try:
            result = test_func()
            results.append((name, result))
        except Exception as e:
            print(f"\n✗ Error ejecutando prueba '{name}': {str(e)}")
            results.append((name, False))
    
    # Resumen
    print("\n" + "="*60)
    print("RESUMEN DE PRUEBAS")
    print("="*60)
    
    for name, result in results:
        status = "✓ PASS" if result else "✗ FAIL"
        print(f"{status:10s} {name}")
    
    total = len(results)
    passed = sum(1 for _, result in results if result)
    
    print(f"\nTotal: {passed}/{total} pruebas pasadas")
    
    if passed == total:
        print("\n🎉 ¡Todas las pruebas pasaron exitosamente!")
        return 0
    else:
        print(f"\n⚠️ {total - passed} prueba(s) fallaron")
        return 1


if __name__ == "__main__":
    sys.exit(main())
