"""
Script para ejecutar todos los tests del sistema
Ejecuta todos los tests y genera un reporte consolidado
"""
import subprocess
import sys
import os

# Lista de todos los scripts de test
TESTS = [
    ("Sistema de Excepciones", "scripts/test_exceptions.py"),
    ("Sistema de Logging", "scripts/test_logging.py"),
    ("Controlador de Flujo", "scripts/test_flow_controller.py"),
    ("Endpoint /status", "scripts/test_status_endpoint.py"),
    ("Manejo de Turnstile", "scripts/test_turnstile_handling.py"),
    ("Toggle Service", "scripts/test_toggle_service.py"),
    ("Verificación DNS Real", "scripts/test_verificacion_dns_real.py"),
]


def run_test(name, script_path):
    """Ejecuta un test individual"""
    print(f"\n{'=' * 70}")
    print(f"🧪 EJECUTANDO: {name}")
    print(f"{'=' * 70}\n")
    
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
    
    for name, passed in results:
        status = "✅ PASADO" if passed else "❌ FALLADO"
        print(f"  {status:12} - {name}")
    
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
