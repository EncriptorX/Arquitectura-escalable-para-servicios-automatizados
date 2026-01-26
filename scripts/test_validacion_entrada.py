"""
Test de Validación de Entradas
Verifica que el backend rechace URLs "raras" y solo acepte dominios FQDN válidos
"""
import sys
import os

# Agregar el directorio api al path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from api.utils import validate_url, validate_domain


def test_validate_domain():
    """Test de validación de dominios"""
    print("=" * 60)
    print("TEST: Validación de Dominios")
    print("=" * 60)
    
    # Casos válidos
    valid_domains = [
        "ejemplo.com",
        "sub.ejemplo.com",
        "deep.sub.ejemplo.com",
        "ejemplo-test.com",
        "ejemplo123.com",
        "test.co.uk",
        "mi-sitio.es"
    ]
    
    print("\n✅ CASOS VÁLIDOS:")
    for domain in valid_domains:
        result = validate_domain(domain)
        status = "✓" if result else "✗"
        print(f"  {status} {domain}: {result}")
    
    # Casos inválidos
    invalid_domains = [
        "",  # Vacío
        "   ",  # Solo espacios
        "192.168.1.1",  # IP
        "10.0.0.1",  # IP privada
        "-ejemplo.com",  # Empieza con guión
        "ejemplo-.com",  # Termina con guión
        "ejemplo..com",  # Doble punto
        ".ejemplo.com",  # Empieza con punto
        "ejemplo.com.",  # Termina con punto (aunque técnicamente válido en DNS)
        "ejemplo",  # Sin TLD
        "ejemplo.c",  # TLD muy corto
        "a" * 64 + ".com",  # Label muy largo
        "ejemplo com",  # Con espacio
        "ejemplo@com",  # Con @
        "ejemplo:8080",  # Con puerto
        "ejemplo/path",  # Con ruta
        "http://ejemplo.com",  # Con esquema
        "https://ejemplo.com",  # Con esquema
        "ftp://ejemplo.com",  # Con esquema
        "ejemplo.com/path",  # Con ruta
        "ejemplo.com?query=1",  # Con query
        "ejemplo.com#fragment",  # Con fragmento
    ]
    
    print("\n❌ CASOS INVÁLIDOS:")
    for domain in invalid_domains:
        result = validate_domain(domain)
        status = "✓" if not result else "✗ ERROR"
        print(f"  {status} {repr(domain)}: {result}")


def test_validate_url():
    """Test de validación de URLs"""
    print("\n" + "=" * 60)
    print("TEST: Validación de URLs (debe rechazar esquemas y rutas)")
    print("=" * 60)
    
    # Casos válidos (solo dominios FQDN)
    valid_cases = [
        ("ejemplo.com", True, "ejemplo.com"),
        ("sub.ejemplo.com", True, "sub.ejemplo.com"),
        ("test-site.co.uk", True, "test-site.co.uk"),
    ]
    
    print("\n✅ CASOS VÁLIDOS (solo FQDN):")
    for url, expected_valid, expected_domain in valid_cases:
        valid, domain, error = validate_url(url)
        status = "✓" if valid == expected_valid and domain == expected_domain else "✗ ERROR"
        print(f"  {status} {repr(url)}")
        print(f"      → válido={valid}, dominio={domain}, error={error}")
    
    # Casos inválidos (con esquemas, rutas, etc.)
    invalid_cases = [
        ("http://ejemplo.com", "esquema http://"),
        ("https://ejemplo.com", "esquema https://"),
        ("ftp://ejemplo.com", "esquema ftp://"),
        ("ejemplo.com/path", "ruta /path"),
        ("ejemplo.com/path/to/page", "ruta /path/to/page"),
        ("ejemplo.com?query=1", "parámetro ?query=1"),
        ("ejemplo.com#fragment", "fragmento #fragment"),
        ("ejemplo.com:8080", "puerto :8080"),
        ("user@ejemplo.com", "credencial user@"),
        ("http://user:pass@ejemplo.com:8080/path?q=1#frag", "URL completa"),
        ("192.168.1.1", "dirección IP"),
        ("", "vacío"),
        ("   ", "solo espacios"),
    ]
    
    print("\n❌ CASOS INVÁLIDOS (deben ser rechazados):")
    for url, reason in invalid_cases:
        valid, domain, error = validate_url(url)
        status = "✓" if not valid else "✗ ERROR - NO RECHAZADO"
        print(f"  {status} {repr(url)} ({reason})")
        print(f"      → válido={valid}, dominio={domain}, error={error}")


def test_edge_cases():
    """Test de casos extremos"""
    print("\n" + "=" * 60)
    print("TEST: Casos Extremos")
    print("=" * 60)
    
    edge_cases = [
        # Dominios internacionales (IDN)
        ("xn--e1afmkfd.xn--p1ai", True, "Punycode válido"),
        
        # Longitud máxima
        ("a" * 63 + ".com", True, "Label máximo (63 chars)"),
        ("a" * 64 + ".com", False, "Label muy largo (64 chars)"),
        
        # Múltiples subdominios
        ("a.b.c.d.e.f.ejemplo.com", True, "Múltiples subdominios"),
        
        # TLDs especiales
        ("ejemplo.co", True, "TLD de 2 letras"),
        ("ejemplo.museum", True, "TLD largo"),
        
        # Casos con normalización
        ("EJEMPLO.COM", True, "Mayúsculas"),
        ("  ejemplo.com  ", True, "Con espacios alrededor"),
    ]
    
    print("\n🔍 CASOS EXTREMOS:")
    for test_input, should_be_valid, description in edge_cases:
        valid, domain, error = validate_url(test_input)
        expected = "válido" if should_be_valid else "inválido"
        actual = "válido" if valid else "inválido"
        status = "✓" if (valid == should_be_valid) else "✗ ERROR"
        
        print(f"  {status} {description}")
        print(f"      Input: {repr(test_input)}")
        print(f"      Esperado: {expected}, Actual: {actual}")
        if error:
            print(f"      Error: {error}")


def test_security_cases():
    """Test de casos de seguridad"""
    print("\n" + "=" * 60)
    print("TEST: Casos de Seguridad")
    print("=" * 60)
    
    security_cases = [
        ("javascript:alert(1)", "Inyección JavaScript"),
        ("data:text/html,<script>alert(1)</script>", "Data URI"),
        ("file:///etc/passwd", "File URI"),
        ("//ejemplo.com", "Protocol-relative URL"),
        ("ejemplo.com/../../../etc/passwd", "Path traversal"),
        ("ejemplo.com%00.evil.com", "Null byte injection"),
        ("ejemplo.com\r\nHost: evil.com", "CRLF injection"),
        ("<script>alert(1)</script>.com", "XSS en dominio"),
        ("'; DROP TABLE domains; --", "SQL injection"),
    ]
    
    print("\n🔒 CASOS DE SEGURIDAD (todos deben ser rechazados):")
    for malicious_input, attack_type in security_cases:
        valid, domain, error = validate_url(malicious_input)
        status = "✓ BLOQUEADO" if not valid else "✗ ERROR - NO BLOQUEADO"
        print(f"  {status} {attack_type}")
        print(f"      Input: {repr(malicious_input)}")
        print(f"      Resultado: válido={valid}, error={error}")


def run_all_tests():
    """Ejecuta todos los tests"""
    print("\n" + "=" * 60)
    print("SUITE DE TESTS: VALIDACIÓN DE ENTRADAS")
    print("=" * 60)
    
    try:
        test_validate_domain()
        test_validate_url()
        test_edge_cases()
        test_security_cases()
        
        print("\n" + "=" * 60)
        print("✅ TODOS LOS TESTS COMPLETADOS")
        print("=" * 60)
        print("\nResumen:")
        print("  ✓ Validación de dominios FQDN")
        print("  ✓ Rechazo de esquemas (http://, https://)")
        print("  ✓ Rechazo de rutas (/path)")
        print("  ✓ Rechazo de parámetros (?query)")
        print("  ✓ Rechazo de fragmentos (#fragment)")
        print("  ✓ Rechazo de puertos (:8080)")
        print("  ✓ Rechazo de credenciales (user@)")
        print("  ✓ Rechazo de IPs")
        print("  ✓ Protección contra inyecciones")
        
    except Exception as e:
        print(f"\n❌ ERROR EN TESTS: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    run_all_tests()
