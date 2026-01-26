"""
Script de prueba para verificación real de delegación DNS
Verifica que la función verify_dns funcione correctamente
"""
import sys
import os
import importlib.util

# Agregar el directorio api al path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'api'))

try:
    import dns.resolver
    DNS_AVAILABLE = True
except ImportError:
    DNS_AVAILABLE = False
    print("⚠️ ADVERTENCIA: dnspython no está instalado")
    print("   Instala con: pip install dnspython")
    sys.exit(1)

# Importar el módulo con guión en el nombre
spec = importlib.util.spec_from_file_location(
    "verificar_delegacion",
    os.path.join(os.path.dirname(__file__), '..', 'api', 'verificar-delegacion.py')
)
verificar_delegacion_module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(verificar_delegacion_module)

verify_dns = verificar_delegacion_module.verify_dns
obtener_nameservers_actuales = verificar_delegacion_module.obtener_nameservers_actuales
verificar_delegacion = verificar_delegacion_module.verificar_delegacion


def test_verify_dns_cloudflare():
    """Prueba verificación DNS con un dominio conocido de Cloudflare"""
    print("=" * 60)
    print("TEST 1: Verificar dominio de Cloudflare")
    print("=" * 60)
    
    # Cloudflare.com usa sus propios nameservers
    domain = "cloudflare.com"
    expected_ns = ["ns3.cloudflare.com", "ns4.cloudflare.com", "ns5.cloudflare.com"]
    
    try:
        is_delegated, actual_ns = verify_dns(domain, expected_ns)
        
        print(f"\n✓ Dominio: {domain}")
        print(f"✓ Nameservers esperados: {expected_ns}")
        print(f"✓ Nameservers actuales: {actual_ns}")
        print(f"✓ Está delegado: {is_delegated}")
        
        assert is_delegated == True, "cloudflare.com debería estar delegado a Cloudflare"
        assert len(actual_ns) > 0, "Debe retornar nameservers"
        
        print("\n✅ TEST 1 PASADO")
        
    except Exception as e:
        print(f"\n❌ TEST 1 FALLIDO: {str(e)}")
        raise


def test_verify_dns_google():
    """Prueba verificación DNS con un dominio que NO usa Cloudflare"""
    print("\n" + "=" * 60)
    print("TEST 2: Verificar dominio que NO usa Cloudflare")
    print("=" * 60)
    
    domain = "google.com"
    expected_ns = ["ns1.cloudflare.com", "ns2.cloudflare.com"]
    
    try:
        is_delegated, actual_ns = verify_dns(domain, expected_ns)
        
        print(f"\n✓ Dominio: {domain}")
        print(f"✓ Nameservers esperados (Cloudflare): {expected_ns}")
        print(f"✓ Nameservers actuales: {actual_ns}")
        print(f"✓ Está delegado a Cloudflare: {is_delegated}")
        
        assert is_delegated == False, "google.com NO debería estar delegado a Cloudflare"
        assert len(actual_ns) > 0, "Debe retornar nameservers"
        assert not any("cloudflare" in ns.lower() for ns in actual_ns), "No debería tener NS de Cloudflare"
        
        print("\n✅ TEST 2 PASADO")
        
    except Exception as e:
        print(f"\n❌ TEST 2 FALLIDO: {str(e)}")
        raise


def test_verify_dns_invalid_domain():
    """Prueba verificación DNS con dominio inválido"""
    print("\n" + "=" * 60)
    print("TEST 3: Verificar dominio inválido")
    print("=" * 60)
    
    domain = "este-dominio-no-existe-12345.com"
    expected_ns = ["ns1.cloudflare.com"]
    
    try:
        is_delegated, actual_ns = verify_dns(domain, expected_ns)
        print(f"\n❌ TEST 3 FALLIDO: Debería haber lanzado excepción")
        assert False, "Debería haber lanzado DNSResolutionError"
        
    except Exception as e:
        # Aceptar tanto DNSResolutionError como ValueError
        error_name = type(e).__name__
        if "DNSResolutionError" in error_name or "ValueError" in error_name:
            print(f"\n✓ Excepción esperada capturada ({error_name}): {str(e)}")
            assert "no existe" in str(e).lower(), "Mensaje de error debe indicar que no existe"
            print("\n✅ TEST 3 PASADO")
        else:
            print(f"\n❌ TEST 3 FALLIDO: Excepción incorrecta: {error_name} - {str(e)}")
            raise
        raise


def test_obtener_nameservers_actuales():
    """Prueba la función obtener_nameservers_actuales"""
    print("\n" + "=" * 60)
    print("TEST 4: Función obtener_nameservers_actuales")
    print("=" * 60)
    
    # Dominio válido
    domain = "cloudflare.com"
    
    try:
        nameservers, error = obtener_nameservers_actuales(domain)
        
        print(f"\n✓ Dominio: {domain}")
        print(f"✓ Nameservers: {nameservers}")
        print(f"✓ Error: {error}")
        
        assert error is None, "No debería haber error"
        assert nameservers is not None, "Debe retornar nameservers"
        assert len(nameservers) > 0, "Debe tener al menos un nameserver"
        
        print("\n✅ TEST 4 PASADO")
        
    except Exception as e:
        print(f"\n❌ TEST 4 FALLIDO: {str(e)}")
        raise


def test_verificar_delegacion():
    """Prueba la función verificar_delegacion"""
    print("\n" + "=" * 60)
    print("TEST 5: Función verificar_delegacion")
    print("=" * 60)
    
    # Caso 1: Delegación correcta
    ns_actual = ["ns1.cloudflare.com", "ns2.cloudflare.com"]
    ns_cf = ["ns1.cloudflare.com", "ns2.cloudflare.com"]
    
    result = verificar_delegacion(ns_actual, ns_cf)
    assert result == True, "Debería estar delegado"
    print("✓ Caso 1: Delegación completa - PASADO")
    
    # Caso 2: Delegación parcial (al menos uno coincide)
    ns_actual = ["ns1.cloudflare.com", "ns1.google.com"]
    ns_cf = ["ns1.cloudflare.com", "ns2.cloudflare.com"]
    
    result = verificar_delegacion(ns_actual, ns_cf)
    assert result == True, "Debería estar delegado (parcial)"
    print("✓ Caso 2: Delegación parcial - PASADO")
    
    # Caso 3: Sin delegación
    ns_actual = ["ns1.google.com", "ns2.google.com"]
    ns_cf = ["ns1.cloudflare.com", "ns2.cloudflare.com"]
    
    result = verificar_delegacion(ns_actual, ns_cf)
    assert result == False, "NO debería estar delegado"
    print("✓ Caso 3: Sin delegación - PASADO")
    
    # Caso 4: Normalización (mayúsculas/minúsculas y punto final)
    ns_actual = ["NS1.CLOUDFLARE.COM.", "ns2.google.com"]
    ns_cf = ["ns1.cloudflare.com", "ns2.cloudflare.com"]
    
    result = verificar_delegacion(ns_actual, ns_cf)
    assert result == True, "Debería estar delegado (normalizado)"
    print("✓ Caso 4: Normalización - PASADO")
    
    print("\n✅ TEST 5 PASADO")


def test_integration():
    """Prueba de integración completa"""
    print("\n" + "=" * 60)
    print("TEST 6: Integración Completa")
    print("=" * 60)
    
    # Simular flujo completo
    domain = "cloudflare.com"
    
    # 1. Obtener NS actuales
    ns_actuales, error = obtener_nameservers_actuales(domain)
    assert error is None, "No debería haber error"
    print(f"✓ Paso 1: NS actuales obtenidos: {ns_actuales}")
    
    # 2. Simular NS de Cloudflare
    ns_cf = ["ns3.cloudflare.com", "ns4.cloudflare.com"]
    
    # 3. Verificar delegación
    delegado = verificar_delegacion(ns_actuales, ns_cf)
    print(f"✓ Paso 2: Delegación verificada: {delegado}")
    
    # 4. Usar verify_dns directamente
    delegado_real, ns_real = verify_dns(domain, ns_cf)
    print(f"✓ Paso 3: Verificación real: {delegado_real}")
    print(f"✓ Paso 3: NS reales: {ns_real}")
    
    assert delegado == delegado_real, "Ambos métodos deben dar el mismo resultado"
    
    print("\n✅ TEST 6 PASADO")


if __name__ == "__main__":
    try:
        print("\n🧪 INICIANDO TESTS DE VERIFICACIÓN DNS REAL\n")
        
        test_verify_dns_cloudflare()
        test_verify_dns_google()
        test_verify_dns_invalid_domain()
        test_obtener_nameservers_actuales()
        test_verificar_delegacion()
        test_integration()
        
        print("\n" + "=" * 60)
        print("🎉 TODOS LOS TESTS COMPLETADOS EXITOSAMENTE")
        print("=" * 60)
        print("\n✅ La verificación DNS real está funcionando correctamente")
        print("✅ dnspython está instalado y operativo")
        print("✅ Todas las funciones de verificación funcionan como se espera")
        
    except AssertionError as e:
        print(f"\n❌ TEST FALLIDO: {str(e)}")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
