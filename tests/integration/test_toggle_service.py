"""
Script de prueba para el endpoint /toggle-service
Verifica la funcionalidad de activación/desactivación del servicio
"""
import sys
import os

# Agregar el directorio raíz del proyecto al path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from api.config import is_service_enabled, toggle_service

def test_toggle_service():
    """Prueba las funciones de toggle del servicio"""
    print("=" * 60)
    print("TEST: Toggle Service")
    print("=" * 60)
    
    # Estado inicial
    initial_state = is_service_enabled()
    print(f"\n✓ Estado inicial del servicio: {'HABILITADO' if initial_state else 'DESHABILITADO'}")
    
    # Deshabilitar servicio
    print("\n[TEST 1] Deshabilitando servicio...")
    new_state = toggle_service(False)
    current_state = is_service_enabled()
    
    assert new_state == False, "El estado retornado debe ser False"
    assert current_state == False, "El servicio debe estar deshabilitado"
    print(f"✓ Servicio deshabilitado correctamente: {current_state}")
    
    # Habilitar servicio
    print("\n[TEST 2] Habilitando servicio...")
    new_state = toggle_service(True)
    current_state = is_service_enabled()
    
    assert new_state == True, "El estado retornado debe ser True"
    assert current_state == True, "El servicio debe estar habilitado"
    print(f"✓ Servicio habilitado correctamente: {current_state}")
    
    # Toggle múltiple
    print("\n[TEST 3] Toggle múltiple...")
    for i in range(3):
        state = i % 2 == 0
        toggle_service(state)
        current = is_service_enabled()
        assert current == state, f"Estado esperado: {state}, obtenido: {current}"
        print(f"  Toggle {i+1}: {'HABILITADO' if current else 'DESHABILITADO'} ✓")
    
    # Restaurar estado inicial
    toggle_service(initial_state)
    print(f"\n✓ Estado restaurado a: {'HABILITADO' if initial_state else 'DESHABILITADO'}")
    
    print("\n" + "=" * 60)
    print("✅ TODOS LOS TESTS PASARON")
    print("=" * 60)

def test_service_state_persistence():
    """Verifica que el estado se mantiene entre llamadas"""
    print("\n" + "=" * 60)
    print("TEST: Persistencia del Estado")
    print("=" * 60)
    
    # Establecer estado
    toggle_service(False)
    state1 = is_service_enabled()
    
    # Verificar que se mantiene
    state2 = is_service_enabled()
    state3 = is_service_enabled()
    
    assert state1 == state2 == state3 == False, "El estado debe mantenerse entre llamadas"
    print("✓ Estado se mantiene consistente entre múltiples llamadas")
    
    # Cambiar y verificar
    toggle_service(True)
    state4 = is_service_enabled()
    state5 = is_service_enabled()
    
    assert state4 == state5 == True, "El estado debe mantenerse después del cambio"
    print("✓ Estado se mantiene después de cambiar")
    
    print("\n✅ TEST DE PERSISTENCIA PASADO")

def test_idempotencia():
    """Verifica que llamadas repetidas con el mismo valor son idempotentes"""
    print("\n" + "=" * 60)
    print("TEST: Idempotencia")
    print("=" * 60)
    
    # Habilitar múltiples veces
    print("\n[TEST] Habilitar múltiples veces...")
    for i in range(3):
        result = toggle_service(True)
        assert result == True, "Debe retornar True"
        assert is_service_enabled() == True, "Debe estar habilitado"
    print("✓ Habilitar múltiples veces es idempotente")
    
    # Deshabilitar múltiples veces
    print("\n[TEST] Deshabilitar múltiples veces...")
    for i in range(3):
        result = toggle_service(False)
        assert result == False, "Debe retornar False"
        assert is_service_enabled() == False, "Debe estar deshabilitado"
    print("✓ Deshabilitar múltiples veces es idempotente")
    
    print("\n✅ TEST DE IDEMPOTENCIA PASADO")

if __name__ == "__main__":
    try:
        test_toggle_service()
        test_service_state_persistence()
        test_idempotencia()
        
        print("\n" + "=" * 60)
        print("🎉 TODOS LOS TESTS COMPLETADOS EXITOSAMENTE")
        print("=" * 60)
        
    except AssertionError as e:
        print(f"\n❌ TEST FALLIDO: {str(e)}")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
