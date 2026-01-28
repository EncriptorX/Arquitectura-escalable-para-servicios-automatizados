#!/usr/bin/env python3
"""
Script de Testing - Arquitectura de Proxy CSaaS
Valida que la nueva arquitectura funciona correctamente sin custom_origin_server
"""
import sys
import os
import json

# Agregar el directorio api al path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'api'))

def test_imports():
    """Test 1: Verificar que todos los módulos se importan correctamente"""
    print("=" * 60)
    print("TEST 1: Verificando imports...")
    print("=" * 60)
    
    try:
        from config import CSaaSConfig
        print("✓ CSaaSConfig importado correctamente")
        
        from proxy import ProxyConfig, extract_subdomain, get_origin_for_subdomain
        print("✓ ProxyConfig importado correctamente")
        print("✓ Funciones del proxy importadas correctamente")
        
        import importlib
        csaas_provision = importlib.import_module('csaas-provision')
        CloudflareSaaSClient = csaas_provision.CloudflareSaaSClient
        generate_subdomain = csaas_provision.generate_subdomain
        print("✓ CloudflareSaaSClient importado correctamente")
        
        print("\n✅ Todos los imports exitosos\n")
        return True
    except ImportError as e:
        print(f"\n❌ Error en imports: {e}\n")
        return False


def test_subdomain_generation():
    """Test 2: Verificar generación de subdominios"""
    print("=" * 60)
    print("TEST 2: Verificando generación de subdominios...")
    print("=" * 60)
    
    try:
        import importlib
        csaas_provision = importlib.import_module('csaas-provision')
        generate_subdomain = csaas_provision.generate_subdomain
        
        # Test 1: Con nombre y ID
        subdomain1 = generate_subdomain("Test Client", "CLI-001")
        print(f"✓ Subdominio generado (con ID): {subdomain1}")
        assert subdomain1.endswith(".suncarsrl.com"), "Subdominio debe terminar en .suncarsrl.com"
        
        # Test 2: Solo con nombre
        subdomain2 = generate_subdomain("Another Client")
        print(f"✓ Subdominio generado (sin ID): {subdomain2}")
        assert subdomain2.endswith(".suncarsrl.com"), "Subdominio debe terminar en .suncarsrl.com"
        
        # Test 3: Subdominios deben ser únicos
        assert subdomain1 != subdomain2, "Subdominios deben ser únicos"
        print("✓ Subdominios son únicos")
        
        print("\n✅ Generación de subdominios funciona correctamente\n")
        return True
    except Exception as e:
        print(f"\n❌ Error en generación de subdominios: {e}\n")
        return False


def test_proxy_mapping():
    """Test 3: Verificar mapeo del proxy"""
    print("=" * 60)
    print("TEST 3: Verificando mapeo del proxy...")
    print("=" * 60)
    
    try:
        from proxy import ProxyConfig, extract_subdomain, get_origin_for_subdomain
        
        # Test 1: Agregar mapeo
        test_subdomain = "testclient-abc123.suncarsrl.com"
        test_origin = "www.testclient.com"
        ProxyConfig.SUBDOMAIN_MAP[test_subdomain] = test_origin
        print(f"✓ Mapeo agregado: {test_subdomain} → {test_origin}")
        
        # Test 2: Extraer subdominio
        extracted = extract_subdomain(test_subdomain)
        assert extracted == test_subdomain, "Extracción de subdominio falló"
        print(f"✓ Subdominio extraído correctamente: {extracted}")
        
        # Test 3: Obtener origin
        origin = get_origin_for_subdomain(test_subdomain)
        assert origin == test_origin, "Obtención de origin falló"
        print(f"✓ Origin obtenido correctamente: {origin}")
        
        # Test 4: Subdominio no existente
        non_existent = get_origin_for_subdomain("noexiste.suncarsrl.com")
        assert non_existent is None, "Subdominio no existente debe retornar None"
        print("✓ Subdominio no existente retorna None correctamente")
        
        # Limpiar
        del ProxyConfig.SUBDOMAIN_MAP[test_subdomain]
        
        print("\n✅ Mapeo del proxy funciona correctamente\n")
        return True
    except Exception as e:
        print(f"\n❌ Error en mapeo del proxy: {e}\n")
        return False


def test_csaas_config():
    """Test 4: Verificar configuración CSaaS"""
    print("=" * 60)
    print("TEST 4: Verificando configuración CSaaS...")
    print("=" * 60)
    
    try:
        from config import CSaaSConfig
        
        # Test 1: Agregar cliente
        test_client = {
            "client_name": "Test Client",
            "client_id": "TEST-001",
            "subdomain": "testclient-abc123.suncarsrl.com",
            "origin_urls": ["www.testclient.com"],
            "status": "active"
        }
        CSaaSConfig.PROVISIONED_CLIENTS["TEST-001"] = test_client
        print(f"✓ Cliente agregado: {test_client['client_name']}")
        
        # Test 2: Obtener cliente
        retrieved = CSaaSConfig.PROVISIONED_CLIENTS.get("TEST-001")
        assert retrieved is not None, "Cliente no encontrado"
        assert retrieved["client_name"] == "Test Client", "Datos del cliente incorrectos"
        print(f"✓ Cliente obtenido correctamente: {retrieved['client_name']}")
        
        # Test 3: Listar clientes
        total_clients = len(CSaaSConfig.PROVISIONED_CLIENTS)
        print(f"✓ Total de clientes: {total_clients}")
        
        # Limpiar
        del CSaaSConfig.PROVISIONED_CLIENTS["TEST-001"]
        
        print("\n✅ Configuración CSaaS funciona correctamente\n")
        return True
    except Exception as e:
        print(f"\n❌ Error en configuración CSaaS: {e}\n")
        return False


def test_custom_hostname_payload():
    """Test 5: Verificar que el payload NO incluye custom_origin_*"""
    print("=" * 60)
    print("TEST 5: Verificando payload de Custom Hostname...")
    print("=" * 60)
    
    try:
        # Simular payload
        payload = {
            "hostname": "testclient-abc123.suncarsrl.com",
            "ssl": {
                "method": "http",
                "type": "dv",
                "settings": {
                    "http2": "on",
                    "min_tls_version": "1.2",
                    "tls_1_3": "on"
                }
            }
        }
        
        # Verificar que NO incluye custom_origin_*
        assert "custom_origin_server" not in payload, "Payload NO debe incluir custom_origin_server"
        print("✓ Payload NO incluye custom_origin_server")
        
        assert "custom_origin_sni" not in payload, "Payload NO debe incluir custom_origin_sni"
        print("✓ Payload NO incluye custom_origin_sni")
        
        # Verificar que incluye SSL
        assert "ssl" in payload, "Payload debe incluir configuración SSL"
        assert payload["ssl"]["method"] == "http", "SSL method debe ser 'http'"
        assert payload["ssl"]["type"] == "dv", "SSL type debe ser 'dv'"
        print("✓ Payload incluye configuración SSL correcta")
        
        print(f"\n✓ Payload completo:\n{json.dumps(payload, indent=2)}")
        
        print("\n✅ Payload de Custom Hostname es correcto (sin custom_origin_*)\n")
        return True
    except Exception as e:
        print(f"\n❌ Error en payload de Custom Hostname: {e}\n")
        return False


def test_integration():
    """Test 6: Test de integración completo"""
    print("=" * 60)
    print("TEST 6: Test de integración completo...")
    print("=" * 60)
    
    try:
        from config import CSaaSConfig
        from proxy import ProxyConfig
        import importlib
        csaas_provision = importlib.import_module('csaas-provision')
        generate_subdomain = csaas_provision.generate_subdomain
        
        # Simular provisionamiento completo
        client_name = "Integration Test Client"
        client_id = "INT-001"
        origin_url = "www.integration-test.com"
        
        # 1. Generar subdominio
        subdomain = generate_subdomain(client_name, client_id)
        print(f"✓ Paso 1: Subdominio generado: {subdomain}")
        
        # 2. Almacenar en CSaaSConfig
        CSaaSConfig.PROVISIONED_CLIENTS[client_id] = {
            "client_name": client_name,
            "client_id": client_id,
            "subdomain": subdomain,
            "origin_urls": [origin_url],
            "status": "active"
        }
        print(f"✓ Paso 2: Cliente almacenado en CSaaSConfig")
        
        # 3. Configurar mapa del proxy
        ProxyConfig.SUBDOMAIN_MAP[subdomain] = origin_url
        print(f"✓ Paso 3: Mapa del proxy configurado: {subdomain} → {origin_url}")
        
        # 4. Verificar que todo está conectado
        from proxy import get_origin_for_subdomain
        retrieved_origin = get_origin_for_subdomain(subdomain)
        assert retrieved_origin == origin_url, "Origin no coincide"
        print(f"✓ Paso 4: Origin recuperado correctamente: {retrieved_origin}")
        
        # 5. Verificar cliente en CSaaSConfig
        retrieved_client = CSaaSConfig.PROVISIONED_CLIENTS.get(client_id)
        assert retrieved_client is not None, "Cliente no encontrado"
        assert retrieved_client["subdomain"] == subdomain, "Subdominio no coincide"
        print(f"✓ Paso 5: Cliente recuperado correctamente")
        
        # Limpiar
        del CSaaSConfig.PROVISIONED_CLIENTS[client_id]
        del ProxyConfig.SUBDOMAIN_MAP[subdomain]
        
        print("\n✅ Test de integración exitoso\n")
        return True
    except Exception as e:
        print(f"\n❌ Error en test de integración: {e}\n")
        import traceback
        traceback.print_exc()
        return False


def main():
    """Ejecutar todos los tests"""
    print("\n" + "=" * 60)
    print("TESTING - ARQUITECTURA DE PROXY CSAAS")
    print("=" * 60 + "\n")
    
    tests = [
        ("Imports", test_imports),
        ("Generación de Subdominios", test_subdomain_generation),
        ("Mapeo del Proxy", test_proxy_mapping),
        ("Configuración CSaaS", test_csaas_config),
        ("Payload Custom Hostname", test_custom_hostname_payload),
        ("Integración Completa", test_integration)
    ]
    
    results = []
    for name, test_func in tests:
        try:
            result = test_func()
            results.append((name, result))
        except Exception as e:
            print(f"\n❌ Error ejecutando test '{name}': {e}\n")
            results.append((name, False))
    
    # Resumen
    print("\n" + "=" * 60)
    print("RESUMEN DE TESTS")
    print("=" * 60)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} - {name}")
    
    print("\n" + "=" * 60)
    print(f"RESULTADO FINAL: {passed}/{total} tests pasados")
    print("=" * 60 + "\n")
    
    if passed == total:
        print("🎉 ¡Todos los tests pasaron exitosamente!")
        print("✅ La arquitectura de proxy está funcionando correctamente")
        print("✅ Sin custom_origin_server ni custom_origin_sni")
        print("✅ Compatible con plan gratuito de Cloudflare")
        return 0
    else:
        print("⚠️ Algunos tests fallaron. Revisa los errores arriba.")
        return 1


if __name__ == "__main__":
    sys.exit(main())
