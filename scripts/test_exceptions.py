"""
Test del Sistema de Excepciones Tipadas
Verifica que las excepciones se manejen correctamente
"""
import sys
import os

# Agregar el directorio api al path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'api'))

from exceptions import (
    BaseAPIError,
    ValidationError,
    AuthenticationError,
    CloudflareAPIError,
    DNSError,
    DNSDelegationError,
    DNSResolutionError,
    DNSRecordExistsError,
    NetworkError,
    TimeoutError,
    ConfigurationError,
    ServiceDisabledError,
    LogicError,
    handle_cloudflare_error,
    get_user_friendly_message
)


def test_validation_error():
    """Test ValidationError"""
    print("🧪 Test: ValidationError")
    
    try:
        raise ValidationError("Dominio inválido", field="domain", value="invalid..domain")
    except ValidationError as e:
        assert e.message == "Dominio inválido"
        assert e.details["field"] == "domain"
        assert e.details["value"] == "invalid..domain"
        assert e.status_code == 400
        assert e.error_category == "user_error"
        
        error_dict = e.to_dict()
        assert error_dict["error_type"] == "ValidationError"
        assert error_dict["message"] == "Dominio inválido"
        
        print("  ✓ ValidationError funciona correctamente")
        return True
    
    return False


def test_authentication_error():
    """Test AuthenticationError"""
    print("🧪 Test: AuthenticationError")
    
    try:
        raise AuthenticationError("Token inválido", reason="expired")
    except AuthenticationError as e:
        assert e.message == "Token inválido"
        assert e.details["reason"] == "expired"
        assert e.status_code == 403
        assert e.error_category == "user_error"
        
        print("  ✓ AuthenticationError funciona correctamente")
        return True
    
    return False


def test_cloudflare_api_error():
    """Test CloudflareAPIError"""
    print("🧪 Test: CloudflareAPIError")
    
    try:
        raise CloudflareAPIError(
            "Error creando zona",
            cf_error_code=1001,
            cf_message="Zone already exists"
        )
    except CloudflareAPIError as e:
        assert e.message == "Error creando zona"
        assert e.details["cloudflare_error_code"] == 1001
        assert e.details["cloudflare_message"] == "Zone already exists"
        assert e.status_code == 502
        assert e.error_category == "cloudflare_error"
        
        print("  ✓ CloudflareAPIError funciona correctamente")
        return True
    
    return False


def test_dns_delegation_error():
    """Test DNSDelegationError"""
    print("🧪 Test: DNSDelegationError")
    
    try:
        raise DNSDelegationError(
            "Dominio no delegado",
            domain="example.com",
            expected_ns=["ns1.cloudflare.com"],
            actual_ns=["ns1.registrar.com"]
        )
    except DNSDelegationError as e:
        assert e.message == "Dominio no delegado"
        assert e.details["domain"] == "example.com"
        assert e.details["expected_nameservers"] == ["ns1.cloudflare.com"]
        assert e.details["actual_nameservers"] == ["ns1.registrar.com"]
        assert e.status_code == 400
        assert e.error_category == "dns_error"
        
        print("  ✓ DNSDelegationError funciona correctamente")
        return True
    
    return False


def test_dns_record_exists_error():
    """Test DNSRecordExistsError (idempotencia)"""
    print("🧪 Test: DNSRecordExistsError")
    
    try:
        raise DNSRecordExistsError("Registro ya existe", record_id="abc123")
    except DNSRecordExistsError as e:
        assert e.message == "Registro ya existe"
        assert e.details["record_id"] == "abc123"
        assert e.details["idempotent"] is True
        assert e.status_code == 200  # No es error, es idempotente
        assert e.error_category == "idempotent"
        
        print("  ✓ DNSRecordExistsError funciona correctamente")
        return True
    
    return False


def test_network_error():
    """Test NetworkError"""
    print("🧪 Test: NetworkError")
    
    try:
        raise NetworkError("Error de conexión", endpoint="https://api.cloudflare.com")
    except NetworkError as e:
        assert e.message == "Error de conexión"
        assert e.details["endpoint"] == "https://api.cloudflare.com"
        assert e.status_code == 503
        assert e.error_category == "network_error"
        
        print("  ✓ NetworkError funciona correctamente")
        return True
    
    return False


def test_service_disabled_error():
    """Test ServiceDisabledError"""
    print("🧪 Test: ServiceDisabledError")
    
    try:
        raise ServiceDisabledError()
    except ServiceDisabledError as e:
        assert "deshabilitado" in e.message.lower()
        assert e.status_code == 503
        assert e.error_category == "service_error"
        
        print("  ✓ ServiceDisabledError funciona correctamente")
        return True
    
    return False


def test_handle_cloudflare_error():
    """Test handle_cloudflare_error"""
    print("🧪 Test: handle_cloudflare_error")
    
    # Test error 81058 (registro existe - idempotencia)
    error_body = {
        "errors": [{
            "code": 81058,
            "message": "DNS record already exists",
            "id": "record123"
        }]
    }
    
    error = handle_cloudflare_error(error_body, "/zones/abc/dns_records")
    assert isinstance(error, DNSRecordExistsError)
    assert error.status_code == 200
    assert error.error_category == "idempotent"
    print("  ✓ Error 81058 (idempotencia) manejado correctamente")
    
    # Test error 10000 (permisos)
    error_body = {
        "errors": [{
            "code": 10000,
            "message": "Authentication error"
        }]
    }
    
    error = handle_cloudflare_error(error_body, "/zones")
    assert isinstance(error, CloudflareAPIError)
    assert error.status_code == 403
    print("  ✓ Error 10000 (permisos) manejado correctamente")
    
    # Test error 1004 (DNS validation)
    error_body = {
        "errors": [{
            "code": 1004,
            "message": "DNS validation error"
        }]
    }
    
    error = handle_cloudflare_error(error_body, "/zones")
    assert isinstance(error, DNSResolutionError)
    print("  ✓ Error 1004 (DNS validation) manejado correctamente")
    
    return True


def test_user_friendly_messages():
    """Test get_user_friendly_message"""
    print("🧪 Test: get_user_friendly_message")
    
    # Test ValidationError
    error = ValidationError("Campo inválido", field="domain")
    message = get_user_friendly_message(error)
    assert "válidos" in message.lower() or "verifica" in message.lower()
    print("  ✓ Mensaje amigable para ValidationError")
    
    # Test CloudflareAPIError
    error = CloudflareAPIError("Error de API", cf_error_code=1001)
    message = get_user_friendly_message(error)
    assert "cloudflare" in message.lower()
    print("  ✓ Mensaje amigable para CloudflareAPIError")
    
    # Test DNSDelegationError
    error = DNSDelegationError("No delegado", domain="example.com")
    message = get_user_friendly_message(error)
    assert "delegado" in message.lower() or "nameservers" in message.lower()
    print("  ✓ Mensaje amigable para DNSDelegationError")
    
    # Test NetworkError
    error = NetworkError("Timeout", endpoint="api.cloudflare.com")
    message = get_user_friendly_message(error)
    assert "conexión" in message.lower() or "red" in message.lower()
    print("  ✓ Mensaje amigable para NetworkError")
    
    return True


def test_exception_hierarchy():
    """Test jerarquía de excepciones"""
    print("🧪 Test: Jerarquía de excepciones")
    
    # Todas las excepciones deben heredar de BaseAPIError
    assert issubclass(ValidationError, BaseAPIError)
    assert issubclass(AuthenticationError, BaseAPIError)
    assert issubclass(CloudflareAPIError, BaseAPIError)
    assert issubclass(DNSError, BaseAPIError)
    assert issubclass(DNSDelegationError, DNSError)
    assert issubclass(DNSResolutionError, DNSError)
    assert issubclass(NetworkError, BaseAPIError)
    assert issubclass(ConfigurationError, BaseAPIError)
    assert issubclass(ServiceDisabledError, BaseAPIError)
    
    print("  ✓ Jerarquía de excepciones correcta")
    return True


def test_error_categories():
    """Test categorías de errores"""
    print("🧪 Test: Categorías de errores")
    
    assert ValidationError("test").error_category == "user_error"
    assert AuthenticationError("test").error_category == "user_error"
    assert CloudflareAPIError("test").error_category == "cloudflare_error"
    assert DNSError("test").error_category == "dns_error"
    assert NetworkError("test").error_category == "network_error"
    assert ConfigurationError("test").error_category == "configuration_error"
    assert ServiceDisabledError().error_category == "service_error"
    assert LogicError("test").error_category == "logic_error"
    
    print("  ✓ Categorías de errores correctas")
    return True


def test_status_codes():
    """Test códigos de estado HTTP"""
    print("🧪 Test: Códigos de estado HTTP")
    
    assert ValidationError("test").status_code == 400
    assert AuthenticationError("test").status_code == 403
    assert CloudflareAPIError("test").status_code == 502
    assert DNSError("test").status_code == 400
    assert DNSRecordExistsError().status_code == 200  # Idempotente
    assert NetworkError("test").status_code == 503
    assert ConfigurationError("test").status_code == 500
    assert ServiceDisabledError().status_code == 503
    
    print("  ✓ Códigos de estado HTTP correctos")
    return True


def run_all_tests():
    """Ejecuta todos los tests"""
    print("=" * 60)
    print("TESTS DEL SISTEMA DE EXCEPCIONES TIPADAS")
    print("=" * 60)
    print()
    
    tests = [
        test_validation_error,
        test_authentication_error,
        test_cloudflare_api_error,
        test_dns_delegation_error,
        test_dns_record_exists_error,
        test_network_error,
        test_service_disabled_error,
        test_handle_cloudflare_error,
        test_user_friendly_messages,
        test_exception_hierarchy,
        test_error_categories,
        test_status_codes
    ]
    
    passed = 0
    failed = 0
    
    for test in tests:
        try:
            if test():
                passed += 1
            else:
                failed += 1
                print(f"  ✗ {test.__name__} falló")
        except Exception as e:
            failed += 1
            print(f"  ✗ {test.__name__} falló con excepción: {str(e)}")
        print()
    
    print("=" * 60)
    print(f"RESULTADOS: {passed} tests pasaron, {failed} tests fallaron")
    print("=" * 60)
    
    return failed == 0


if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)
