#!/usr/bin/env python3
"""
Script para verificar que la validación de dominios cumple con formato FQDN
y rechaza esquemas, rutas y direcciones IP
"""
import re
import sys
import os

# Agregar el directorio raíz al path para importar los módulos
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

# Importar las funciones reales de validación
from api.utils import validate_domain, validate_url

def run_tests():
    """Ejecuta pruebas de validación"""
    print("=" * 80)
    print("PRUEBAS DE VALIDACIÓN DE FORMATO FQDN")
    print("=" * 80)
    print()
    
    # Casos de prueba: (entrada, debe_pasar, descripción)
    test_cases = [
        # CASOS VÁLIDOS - Deben PASAR
        ("example.com", True, "Dominio simple válido"),
        ("sub.example.com", True, "Subdominio válido"),
        ("deep.sub.example.com", True, "Subdominio profundo válido"),
        ("my-site.example.com", True, "Dominio con guiones válido"),
        ("test123.example.com", True, "Dominio con números válido"),
        
        # CASOS INVÁLIDOS - Deben FALLAR
        ("https://example.com", False, "URL con esquema HTTPS"),
        ("http://example.com", False, "URL con esquema HTTP"),
        ("example.com/path", False, "URL con ruta"),
        ("example.com/path/to/page", False, "URL con ruta compleja"),
        ("https://example.com/path", False, "URL completa con esquema y ruta"),
        ("192.168.1.1", False, "Dirección IP privada"),
        ("10.0.0.1", False, "Dirección IP privada clase A"),
        ("8.8.8.8", False, "Dirección IP pública"),
        ("127.0.0.1", False, "Dirección IP localhost"),
        ("example", False, "Dominio sin TLD"),
        ("-example.com", False, "Dominio que empieza con guion"),
        ("example-.com", False, "Dominio que termina con guion"),
        ("", False, "Cadena vacía"),
        ("example..com", False, "Doble punto"),
        ("example .com", False, "Espacio en el dominio"),
    ]
    
    passed_url = 0
    failed_url = 0
    
    print("PRUEBAS DE VALIDACIÓN CON validate_url (api/utils.py):")
    print("-" * 80)
    
    for test_input, should_pass, description in test_cases:
        valid, domain, error = validate_url(test_input)
        
        test_passed = valid == should_pass
        
        status = "✓ PASS" if test_passed else "✗ FAIL"
        
        if test_passed:
            passed_url += 1
        else:
            failed_url += 1
        
        print(f"{status:8} | {test_input:35} | {description}")
        if not test_passed:
            print(f"         | Esperado: {'VÁLIDO' if should_pass else 'INVÁLIDO'}, Obtenido: {'VÁLIDO' if valid else 'INVÁLIDO'}")
            if error:
                print(f"         | Error: {error}")
    
    print()
    print("=" * 80)
    print("RESUMEN DE RESULTADOS")
    print("=" * 80)
    print(f"Pruebas con validate_url: {passed_url}/{len(test_cases)} pasadas, {failed_url} fallidas")
    print()
    
    if failed_url == 0:
        print("✓ TODAS LAS PRUEBAS PASARON")
        print()
        print("VERIFICACIÓN CUMPLIDA:")
        print("  ✓ Los dominios deben cumplir con formato FQDN")
        print("  ✓ Se rechazan esquemas (http://, https://)")
        print("  ✓ Se rechazan rutas (/path)")
        print("  ✓ Se rechazan direcciones IP")
        return 0
    else:
        print("✗ ALGUNAS PRUEBAS FALLARON")
        print()
        print("PROBLEMAS DETECTADOS:")
        if failed_url > 0:
            print(f"  ✗ {failed_url} pruebas con validate_url fallaron")
        return 1

if __name__ == "__main__":
    sys.exit(run_tests())
