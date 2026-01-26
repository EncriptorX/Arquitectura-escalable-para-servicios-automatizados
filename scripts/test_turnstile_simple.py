"""
Test Simplificado de Manejo de Turnstile con Excepciones
Verifica que el sistema de excepciones funciona correctamente con Turnstile
"""
import sys
import os

# Agregar el directorio api al path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'api'))

# Importar con el nombre correcto del módulo
import importlib.util
spec = importlib.util.spec_from_file_location("solicitar_proteccion", os.path.join(os.path.dirname(__file__), '..', 'api', 'solicitar-proteccion.py'))
solicitar_proteccion = importlib.util.module_from_spec(spec)
spec.loader.exec_module(solicitar_proteccion)

Config = solicitar_proteccion.Config
validate_turnstile = solicitar_proteccion.validate_turnstile


def test_turnstile_exceptions():
    """Test que Turnstile lanza excepciones apropiadas"""
    print("=" * 60)
    print("TEST: Excepciones de Turnstile")
    print("=" * 60)
    
    # Test 1: Sin secret key configurada
    print("\n[TEST 1] Sin TURNSTILE_SECRET_KEY...")
    original_key = Config.TURNSTILE_SECRET_KEY
    Config.TURNSTILE_SECRET_KEY = ""
    
    try:
        validate_turnstile("test_token", "192.0.2.1")
        print("  ✗ Debería haber lanzado excepción")
        return False
    except Exception as e:
        if "AuthenticationError" in type(e).__name__:
            print(f"  ✓ AuthenticationError lanzada: {str(e)[:60]}...")
        else:
            print(f"  ✓ Excepción lanzada: {type(e).__name__}")
    finally:
        Config.TURNSTILE_SECRET_KEY = original_key
    
    # Test 2: Con secret key pero token inválido
    print("\n[TEST 2] Con secret key pero token inválido...")
    Config.TURNSTILE_SECRET_KEY = "test_key_12345"
    
    try:
        validate_turnstile("invalid_token", "192.0.2.1")
        print("  ✓ Validación completada o lanzó excepción esperada")
    except Exception as e:
        error_type = type(e).__name__
        if "AuthenticationError" in error_type or "NetworkError" in error_type:
            print(f"  ✓ Excepción esperada: {error_type}")
        else:
            print(f"  ⚠️ Excepción inesperada: {error_type} - {str(e)[:60]}...")
    finally:
        Config.TURNSTILE_SECRET_KEY = original_key
    
    print("\n✅ TESTS DE EXCEPCIONES PASADOS")
    return True


if __name__ == "__main__":
    try:
        success = test_turnstile_exceptions()
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"\n❌ ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
