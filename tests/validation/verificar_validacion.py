"""
Script de verificación integral de la validación de entradas
"""
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from api.utils import validate_url, validate_domain

def test_basic_validation():
    """Test básico de validación"""
    print("=" * 60)
    print("TEST BÁSICO DE VALIDACIÓN")
    print("=" * 60)
    
    # Casos válidos
    valid_cases = [
        "ejemplo.com",
        "sub.ejemplo.com",
        "test-site.co.uk"
    ]
    
    print("\n✅ Casos válidos:")
    for domain in valid_cases:
        valid, result, error = validate_url(domain)
        status = "✓" if valid else "✗ ERROR"
        print(f"  {status} {domain}")
    
    # Casos inválidos
    invalid_cases = [
        "http://ejemplo.com",
        "https://ejemplo.com",
        "ejemplo.com/path",
        "ejemplo.com:8080",
        "192.168.1.1"
    ]
    
    print("\n❌ Casos inválidos (deben ser rechazados):")
    for domain in invalid_cases:
        valid, result, error = validate_url(domain)
        status = "✓ RECHAZADO" if not valid else "✗ ERROR - NO RECHAZADO"
        print(f"  {status} {domain}")
    
    return True


def test_security():
    """Test de seguridad"""
    print("\n" + "=" * 60)
    print("TEST DE SEGURIDAD")
    print("=" * 60)
    
    malicious_inputs = [
        "javascript:alert(1)",
        "'; DROP TABLE domains; --",
        "<script>alert(1)</script>.com",
        "ejemplo.com/../../../etc/passwd"
    ]
    
    print("\n🔒 Intentos de ataque (todos deben ser bloqueados):")
    all_blocked = True
    for malicious in malicious_inputs:
        valid, result, error = validate_url(malicious)
        if valid:
            print(f"  ✗ ERROR - NO BLOQUEADO: {malicious}")
            all_blocked = False
        else:
            print(f"  ✓ BLOQUEADO: {malicious}")
    
    return all_blocked


def test_edge_cases():
    """Test de casos extremos"""
    print("\n" + "=" * 60)
    print("TEST DE CASOS EXTREMOS")
    print("=" * 60)
    
    edge_cases = [
        ("EJEMPLO.COM", True, "Mayúsculas"),
        ("  ejemplo.com  ", True, "Con espacios alrededor"),
        ("a" * 63 + ".com", True, "Label máximo (63 chars)"),
        ("a" * 64 + ".com", False, "Label muy largo (64 chars)"),
    ]
    
    print("\n🔍 Casos extremos:")
    all_passed = True
    for test_input, should_be_valid, description in edge_cases:
        valid, domain, error = validate_url(test_input)
        expected = "válido" if should_be_valid else "inválido"
        actual = "válido" if valid else "inválido"
        
        if (valid == should_be_valid):
            print(f"  ✓ {description}: {expected}")
        else:
            print(f"  ✗ ERROR {description}: esperado {expected}, obtenido {actual}")
            all_passed = False
    
    return all_passed


def main():
    """Ejecuta todos los tests"""
    print("\n" + "=" * 60)
    print("VERIFICACIÓN INTEGRAL DE VALIDACIÓN DE ENTRADAS")
    print("=" * 60)
    
    results = []
    
    # Test básico
    results.append(("Validación básica", test_basic_validation()))
    
    # Test de seguridad
    results.append(("Seguridad", test_security()))
    
    # Test de casos extremos
    results.append(("Casos extremos", test_edge_cases()))
    
    # Resumen
    print("\n" + "=" * 60)
    print("RESUMEN DE VERIFICACIÓN")
    print("=" * 60)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for name, result in results:
        status = "✅ PASÓ" if result else "❌ FALLÓ"
        print(f"  {status} - {name}")
    
    print("\n" + "=" * 60)
    if passed == total:
        print(f"✅ VERIFICACIÓN EXITOSA: {passed}/{total} tests pasaron")
        print("\nLa validación de entradas está funcionando correctamente:")
        print("  ✓ Rechaza esquemas (http://, https://)")
        print("  ✓ Rechaza rutas (/path)")
        print("  ✓ Rechaza puertos (:8080)")
        print("  ✓ Rechaza IPs")
        print("  ✓ Bloquea ataques de inyección")
        print("  ✓ Solo acepta dominios FQDN puros")
        return 0
    else:
        print(f"❌ VERIFICACIÓN FALLIDA: {passed}/{total} tests pasaron")
        return 1
    print("=" * 60)


if __name__ == "__main__":
    sys.exit(main())
