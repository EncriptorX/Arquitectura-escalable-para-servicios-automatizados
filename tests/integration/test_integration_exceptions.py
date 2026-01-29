"""
Test de Integración del Sistema de Excepciones
Verifica que las excepciones fluyan correctamente desde el backend hasta las respuestas
"""
import sys
import os
import json

# Agregar el directorio raíz del proyecto al path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from api.exceptions import (
    ValidationError,
    AuthenticationError,
    CloudflareAPIError,
    CloudflarePermissionError,
    DNSError,
    NetworkError,
    ServiceDisabledError,
    handle_cloudflare_error,
    get_user_friendly_message
)


def test_exception_to_response():
    """Test que las excepciones se convierten correctamente a respuestas JSON"""
    print("=" * 70)
    print("TEST 1: Conversión de Excepciones a Respuestas JSON")
    print("=" * 70)
    
    # Test ValidationError
    try:
        raise ValidationError("Dominio inválido", field="domain", value="invalid..domain")
    except ValidationError as e:
        response = {
            "status": "error",
            "message": get_user_friendly_message(e),
            "error_type": e.__class__.__name__,
            "error_category": e.error_category,
            "technical_message": e.message
        }
        
        assert response["status"] == "error"
        assert response["error_type"] == "ValidationError"
        assert response["error_category"] == "user_error"
        assert "válidos" in response["message"].lower() or "verifica" in response["message"].lower()
        print("  ✓ ValidationError → JSON response correcta")
    
    # Test CloudflareAPIError
    try:
        raise CloudflareAPIError("Error de API", cf_error_code=1001, cf_message="Zone exists")
    except CloudflareAPIError as e:
        response = {
            "status": "error",
            "message": get_user_friendly_message(e),
            "error_type": e.__class__.__name__,
            "error_category": e.error_category,
            "technical_message": e.message
        }
        
        assert response["error_type"] == "CloudflareAPIError"
        assert response["error_category"] == "cloudflare_error"
        assert "cloudflare" in response["message"].lower()
        print("  ✓ CloudflareAPIError → JSON response correcta")
    
    # Test NetworkError
    try:
        raise NetworkError("Timeout", endpoint="api.cloudflare.com")
    except NetworkError as e:
        response = {
            "status": "error",
            "message": get_user_friendly_message(e),
            "error_type": e.__class__.__name__,
            "error_category": e.error_category,
            "technical_message": e.message
        }
        
        assert response["error_type"] == "NetworkError"
        assert response["error_category"] == "network_error"
        print("  ✓ NetworkError → JSON response correcta")
    
    print("\n✅ TEST 1 PASADO\n")


def test_cloudflare_error_mapping():
    """Test que errores de Cloudflare se mapean correctamente"""
    print("=" * 70)
    print("TEST 2: Mapeo de Errores de Cloudflare")
    print("=" * 70)
    
    # Test error 81058 (idempotencia)
    error_body = {
        "errors": [{
            "code": 81058,
            "message": "DNS record already exists",
            "id": "record123"
        }]
    }
    
    error = handle_cloudflare_error(error_body, "/zones/abc/dns_records")
    assert error.__class__.__name__ == "DNSRecordExistsError"
    assert error.status_code == 200
    assert error.error_category == "idempotent"
    print("  ✓ Error 81058 → DNSRecordExistsError (idempotente)")
    
    # Test error 10000 (permisos)
    error_body = {
        "errors": [{
            "code": 10000,
            "message": "Authentication error"
        }]
    }
    
    error = handle_cloudflare_error(error_body, "/zones")
    assert isinstance(error, CloudflareAPIError)
    assert isinstance(error, CloudflarePermissionError)
    assert error.status_code == 403
    print("  ✓ Error 10000 → CloudflarePermissionError")
    
    # Test error 1004 (DNS validation)
    error_body = {
        "errors": [{
            "code": 1004,
            "message": "DNS validation error"
        }]
    }
    
    error = handle_cloudflare_error(error_body, "/zones")
    assert "DNSResolutionError" in error.__class__.__name__
    print("  ✓ Error 1004 → DNSResolutionError")
    
    print("\n✅ TEST 2 PASADO\n")


def test_status_codes():
    """Test que los códigos de estado HTTP son correctos"""
    print("=" * 70)
    print("TEST 3: Códigos de Estado HTTP")
    print("=" * 70)
    
    test_cases = [
        (ValidationError("test"), 400, "ValidationError"),
        (AuthenticationError("test"), 403, "AuthenticationError"),
        (CloudflareAPIError("test"), 502, "CloudflareAPIError"),
        (DNSError("test"), 400, "DNSError"),
        (NetworkError("test"), 503, "NetworkError"),
        (ServiceDisabledError(), 503, "ServiceDisabledError"),
    ]
    
    for exception, expected_code, name in test_cases:
        assert exception.status_code == expected_code, f"{name} debe tener código {expected_code}"
        print(f"  ✓ {name:30} → {expected_code}")
    
    print("\n✅ TEST 3 PASADO\n")


def test_error_categories():
    """Test que las categorías de error son correctas"""
    print("=" * 70)
    print("TEST 4: Categorías de Error")
    print("=" * 70)
    
    test_cases = [
        (ValidationError("test"), "user_error"),
        (AuthenticationError("test"), "user_error"),
        (CloudflareAPIError("test"), "cloudflare_error"),
        (DNSError("test"), "dns_error"),
        (NetworkError("test"), "network_error"),
        (ServiceDisabledError(), "service_error"),
    ]
    
    for exception, expected_category in test_cases:
        assert exception.error_category == expected_category
        print(f"  ✓ {exception.__class__.__name__:30} → {expected_category}")
    
    print("\n✅ TEST 4 PASADO\n")


def test_user_friendly_messages():
    """Test que los mensajes amigables son apropiados"""
    print("=" * 70)
    print("TEST 5: Mensajes Amigables para Usuarios")
    print("=" * 70)
    
    test_cases = [
        (ValidationError("test"), ["válidos", "verifica"]),
        (CloudflareAPIError("test"), ["cloudflare"]),
        (DNSError("test"), ["dns", "dominio"]),
        (NetworkError("test"), ["conexión", "red"]),
    ]
    
    for exception, keywords in test_cases:
        message = get_user_friendly_message(exception)
        has_keyword = any(kw in message.lower() for kw in keywords)
        assert has_keyword, f"Mensaje debe contener alguna de: {keywords}"
        print(f"  ✓ {exception.__class__.__name__:30} → '{message[:50]}...'")
    
    print("\n✅ TEST 5 PASADO\n")


def test_exception_details():
    """Test que los detalles de excepción se preservan"""
    print("=" * 70)
    print("TEST 6: Detalles de Excepción")
    print("=" * 70)
    
    # ValidationError con detalles
    error = ValidationError("Dominio inválido", field="domain", value="invalid..domain")
    assert error.details["field"] == "domain"
    assert error.details["value"] == "invalid..domain"
    print("  ✓ ValidationError preserva detalles (field, value)")
    
    # CloudflareAPIError con detalles
    error = CloudflareAPIError("Error", cf_error_code=1001, cf_message="Zone exists")
    assert error.details["cloudflare_error_code"] == 1001
    assert error.details["cloudflare_message"] == "Zone exists"
    print("  ✓ CloudflareAPIError preserva detalles (cf_error_code, cf_message)")
    
    # NetworkError con detalles
    error = NetworkError("Timeout", endpoint="api.cloudflare.com")
    assert error.details["endpoint"] == "api.cloudflare.com"
    print("  ✓ NetworkError preserva detalles (endpoint)")
    
    print("\n✅ TEST 6 PASADO\n")


def test_to_dict_method():
    """Test que el método to_dict() funciona correctamente"""
    print("=" * 70)
    print("TEST 7: Método to_dict()")
    print("=" * 70)
    
    error = ValidationError("Dominio inválido", field="domain", value="test")
    error_dict = error.to_dict()
    
    assert "error_type" in error_dict
    assert "message" in error_dict
    assert "details" in error_dict
    assert error_dict["error_type"] == "ValidationError"
    assert error_dict["message"] == "Dominio inválido"
    assert error_dict["details"]["field"] == "domain"
    
    print("  ✓ to_dict() retorna estructura correcta")
    print(f"  ✓ Estructura: {json.dumps(error_dict, indent=2)}")
    
    print("\n✅ TEST 7 PASADO\n")


def run_all_tests():
    """Ejecuta todos los tests de integración"""
    print("\n" + "=" * 70)
    print("🧪 TESTS DE INTEGRACIÓN DEL SISTEMA DE EXCEPCIONES")
    print("=" * 70)
    print()
    
    tests = [
        test_exception_to_response,
        test_cloudflare_error_mapping,
        test_status_codes,
        test_error_categories,
        test_user_friendly_messages,
        test_exception_details,
        test_to_dict_method,
    ]
    
    passed = 0
    failed = 0
    
    for test in tests:
        try:
            test()
            passed += 1
        except AssertionError as e:
            failed += 1
            print(f"  ✗ {test.__name__} falló: {str(e)}")
        except Exception as e:
            failed += 1
            print(f"  ✗ {test.__name__} falló con excepción: {str(e)}")
    
    print("=" * 70)
    print(f"📊 RESULTADOS: {passed}/{len(tests)} tests pasaron")
    print("=" * 70)
    
    if failed == 0:
        print("\n🎉 ¡TODOS LOS TESTS DE INTEGRACIÓN PASARON!")
        return True
    else:
        print(f"\n⚠️ {failed} test(s) fallaron")
        return False


if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)
