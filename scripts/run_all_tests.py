"""
Script para ejecutar todos los tests del sistema
Ejecuta todos los tests y genera un reporte consolidado
"""
import subprocess
import sys
import os

# Lista de todos los scripts de test organizados por categoría
TESTS = [
    # Tests de Validación
    ("Validación - Suite Completa", "tests/validation/test_validacion_entrada.py"),
    ("Validación - Formato FQDN", "tests/validation/test_validacion_fqdn.py"),
    ("Validación - Tests Rápidos", "tests/validation/test_quick_validation.py"),
    ("Validación - Verificación Integral", "tests/validation/verificar_validacion.py"),
    
    # Tests Unitarios
    ("Unitario - Sistema de Excepciones", "tests/unit/test_exceptions.py"),
    ("Unitario - Sistema de Logging", "tests/unit/test_logging.py"),
    ("Unitario - Idempotencia", "tests/unit/test_idempotencia.py"),
    ("Unitario - Mensajes Informativos", "tests/unit/test_mensajes_informativos.py"),
    
    # Tests de Integración
    ("Integración - Excepciones", "tests/integration/test_integration_exceptions.py"),
    ("Integración - Endpoint /status", "tests/integration/test_status_endpoint.py"),
    ("Integración - Toggle Service", "tests/integration/test_toggle_service.py"),
    ("Integración - Turnstile", "tests/integration/test_turnstile_handling.py"),
    ("Integración - Verificación DNS", "tests/integration/test_verificacion_delegacion.py"),
    ("Integración - Controlador de Flujo", "tests/integration/test_flow_controller.py"),
]


def run_test(name, script_path):
    """Ejecuta un test individual"""
    print(f"\n{'=' * 70}")
    print(f"🧪 EJECUTANDO: {name}")
    print(f"{'=' * 70}\n")
    
    # Verificar que el archivo existe
    if not os.path.exists(script_path):
        print(f"⚠️ Archivo no encontrado: {script_path}")
        return False
    
    try:
        # Configurar encoding UTF-8
        env = os.environ.copy()
        env['PYTHONIOENCODING'] = 'utf-8'
        
        result = subprocess.run(
            [sys.executable, script_path],
            capture_output=True,
            text=True,
            env=env,
            timeout=30
        )
        
        # Mostrar output
        if result.stdout:
            print(result.stdout)
        
        if result.stderr:
            print("STDERR:", result.stderr)
        
        # Verificar resultado
        if result.returncode == 0:
            print(f"✅ {name}: PASADO")
            return True
        else:
            print(f"❌ {name}: FALLADO (código {result.returncode})")
            return False
    
    except subprocess.TimeoutExpired:
        print(f"⏱️ {name}: TIMEOUT (>30s)")
        return False
    
    except Exception as e:
        print(f"💥 {name}: ERROR - {str(e)}")
        return False


def main():
    """Ejecuta todos los tests"""
    print("\n" + "=" * 70)
    print("🚀 EJECUTANDO SUITE COMPLETA DE TESTS")
    print("=" * 70)
    
    results = []
    
    for name, script_path in TESTS:
        passed = run_test(name, script_path)
        results.append((name, passed))
    
    # Reporte final
    print("\n" + "=" * 70)
    print("📊 REPORTE FINAL")
    print("=" * 70)
    print()
    
    passed_count = sum(1 for _, passed in results if passed)
    failed_count = len(results) - passed_count
    
    # Agrupar por categoría
    categories = {
        "Validación": [],
        "Unitario": [],
        "Integración": []
    }
    
    for name, passed in results:
        for category in categories.keys():
            if name.startswith(category):
                categories[category].append((name, passed))
                break
    
    # Mostrar resultados por categoría
    for category, tests in categories.items():
        if tests:
            print(f"\n{category}:")
            for name, passed in tests:
                status = "✅ PASADO" if passed else "❌ FALLADO"
                test_name = name.split(" - ", 1)[1] if " - " in name else name
                print(f"  {status:12} - {test_name}")
    
    print()
    print("=" * 70)
    print(f"TOTAL: {passed_count}/{len(results)} tests pasaron")
    print("=" * 70)
    
    if failed_count == 0:
        print("\n🎉 ¡TODOS LOS TESTS PASARON!")
        return 0
    else:
        print(f"\n⚠️ {failed_count} test(s) fallaron")
        return 1


if __name__ == "__main__":
    sys.exit(main())
