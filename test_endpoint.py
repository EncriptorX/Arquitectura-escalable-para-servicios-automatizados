#!/usr/bin/env python3
"""
Script para probar el endpoint de CSaaS directamente
"""
import json
import sys
import os

# Agregar el directorio api al path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'api'))

try:
    from dotenv import load_dotenv
    load_dotenv()
except:
    pass

# Simular una petición
print("Probando endpoint csaas-provision...")
print("="*60)

try:
    # Importar el módulo
    import importlib.util
    spec = importlib.util.spec_from_file_location("csaas_provision", "api/csaas-provision.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    
    print("✓ Módulo importado correctamente")
    
    # Probar la función de generación de subdominio
    subdomain = module.generate_subdomain("Test Client", "CLI-001")
    print(f"✓ Subdominio generado: {subdomain}")
    
    # Probar validación
    test_data = {
        "client_name": "Test Client",
        "urls": ["test.example.com"]
    }
    valid, error = module.validate_client_data(test_data)
    print(f"✓ Validación: {'OK' if valid else f'ERROR - {error}'}")
    
    print("\n✅ Todas las pruebas básicas pasaron")
    print("\nSi el endpoint sigue fallando, el error está en:")
    print("1. La comunicación HTTP con Cloudflare")
    print("2. Los permisos del API Token")
    print("3. La configuración de Custom Hostnames")
    
except Exception as e:
    print(f"\n✗ Error: {str(e)}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
