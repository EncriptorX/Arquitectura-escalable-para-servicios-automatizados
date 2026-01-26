"""Quick validation test"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from api.utils import validate_url

tests = [
    ('ejemplo.com', True, 'Dominio simple'),
    ('http://ejemplo.com', False, 'Con esquema HTTP'),
    ('https://ejemplo.com', False, 'Con esquema HTTPS'),
    ('ejemplo.com/path', False, 'Con ruta'),
    ('ejemplo.com:8080', False, 'Con puerto'),
    ('192.168.1.1', False, 'Dirección IP'),
    ('user@ejemplo.com', False, 'Con credencial'),
]

print("=" * 60)
print("PRUEBA RÁPIDA DE VALIDACIÓN")
print("=" * 60)

passed = 0
failed = 0

for url, expected, description in tests:
    valid, domain, error = validate_url(url)
    success = (valid == expected)
    
    if success:
        passed += 1
        status = "✓"
    else:
        failed += 1
        status = "✗"
    
    print(f"{status} {description}")
    print(f"  Input: {url}")
    print(f"  Esperado: {'válido' if expected else 'inválido'}")
    print(f"  Resultado: {'válido' if valid else 'inválido'}")
    if error:
        print(f"  Error: {error}")
    print()

print("=" * 60)
print(f"RESULTADO: {passed}/{len(tests)} pruebas pasadas")
if failed == 0:
    print("✅ TODAS LAS PRUEBAS PASARON")
else:
    print(f"❌ {failed} pruebas fallaron")
print("=" * 60)
