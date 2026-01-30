#!/usr/bin/env python3
"""
Script de Verificación - Migración a cubansaas.tech
Verifica que todos los cambios se aplicaron correctamente
"""
import os
import sys
import json

# Colores para output
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
RESET = '\033[0m'

def print_header(text):
    print(f"\n{BLUE}{'='*60}{RESET}")
    print(f"{BLUE}{text:^60}{RESET}")
    print(f"{BLUE}{'='*60}{RESET}\n")

def print_success(text):
    print(f"{GREEN}✓{RESET} {text}")

def print_error(text):
    print(f"{RED}✗{RESET} {text}")

def print_warning(text):
    print(f"{YELLOW}⚠{RESET} {text}")

def check_file_content(filepath, search_text, description):
    """Verifica que un archivo contenga un texto específico"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
            if search_text in content:
                print_success(f"{description}: OK")
                return True
            else:
                print_error(f"{description}: NO ENCONTRADO")
                return False
    except FileNotFoundError:
        print_error(f"{description}: ARCHIVO NO ENCONTRADO - {filepath}")
        return False
    except Exception as e:
        print_error(f"{description}: ERROR - {str(e)}")
        return False

def check_env_example():
    """Verifica .env.example"""
    print_header("Verificando .env.example")
    
    checks = [
        ("CSAAS_ZONE=cubansaas.tech", "Zona CSaaS actualizada"),
        ("CSAAS_CNAME_TARGET=customers.cubansaas.tech", "CNAME target actualizado"),
    ]
    
    results = []
    for search, desc in checks:
        results.append(check_file_content(".env.example", search, desc))
    
    return all(results)

def check_config_py():
    """Verifica api/config.py"""
    print_header("Verificando api/config.py")
    
    checks = [
        ('CSAAS_ZONE = os.getenv("CSAAS_ZONE", "cubansaas.tech")', "Zona CSaaS en config.py"),
        ('CSAAS_CNAME_TARGET = os.getenv("CSAAS_CNAME_TARGET", "customers.cubansaas.tech")', "CNAME target en config.py"),
        ('"*.cubansaas.tech"', "Hosts permitidos actualizados"),
    ]
    
    results = []
    for search, desc in checks:
        results.append(check_file_content("api/config.py", search, desc))
    
    return all(results)

def check_proxy_py():
    """Verifica api/proxy.py"""
    print_header("Verificando api/proxy.py")
    
    checks = [
        ("'.cubansaas.tech'", "Validación de subdominio actualizada"),
        ('"El header Host no es un subdominio válido de cubansaas.tech"', "Mensaje de error actualizado"),
    ]
    
    results = []
    for search, desc in checks:
        results.append(check_file_content("api/proxy.py", search, desc))
    
    return all(results)

def check_csaas_provision_py():
    """Verifica api/csaas-provision.py"""
    print_header("Verificando api/csaas-provision.py")
    
    checks = [
        ("cliente123.cubansaas.tech", "Ejemplo de subdominio actualizado"),
    ]
    
    results = []
    for search, desc in checks:
        results.append(check_file_content("api/csaas-provision.py", search, desc))
    
    return all(results)

def check_csaas_simple_provision_py():
    """Verifica api/csaas-simple-provision.py"""
    print_header("Verificando api/csaas-simple-provision.py")
    
    if not os.path.exists("api/csaas-simple-provision.py"):
        print_error("Archivo csaas-simple-provision.py NO EXISTE")
        return False
    
    checks = [
        ("cubansaas.tech", "Dominio correcto en endpoint simple"),
        ("simple_cname_proxy", "Arquitectura simple configurada"),
    ]
    
    results = []
    for search, desc in checks:
        results.append(check_file_content("api/csaas-simple-provision.py", search, desc))
    
    return all(results)

def check_frontend_form():
    """Verifica src/components/CSaaSRequestForm.tsx"""
    print_header("Verificando Frontend - Formulario")
    
    checks = [
        ("cubansaas.tech", "Dominio actualizado en formulario"),
        ("acme-abc123.cubansaas.tech", "Ejemplo de subdominio actualizado"),
    ]
    
    results = []
    for search, desc in checks:
        results.append(check_file_content("src/components/CSaaSRequestForm.tsx", search, desc))
    
    return all(results)

def check_frontend_result():
    """Verifica src/components/CSaaSResultPage.tsx"""
    print_header("Verificando Frontend - Página de Resultados")
    
    # Este archivo usa variables dinámicas, solo verificamos que existe
    if os.path.exists("src/components/CSaaSResultPage.tsx"):
        print_success("Archivo de resultados existe y usa variables dinámicas")
        return True
    else:
        print_error("Archivo de resultados NO ENCONTRADO")
        return False

def check_documentation():
    """Verifica documentación"""
    print_header("Verificando Documentación")
    
    if os.path.exists("CAMBIOS_DOMINIO_CUBANSAAS.md"):
        print_success("Documento de cambios creado")
        return True
    else:
        print_error("Documento de cambios NO ENCONTRADO")
        return False

def print_summary(results):
    """Imprime resumen de resultados"""
    print_header("RESUMEN DE VERIFICACIÓN")
    
    total = len(results)
    passed = sum(results.values())
    failed = total - passed
    
    print(f"Total de verificaciones: {total}")
    print(f"{GREEN}Pasadas: {passed}{RESET}")
    print(f"{RED}Fallidas: {failed}{RESET}")
    
    if failed == 0:
        print(f"\n{GREEN}{'='*60}{RESET}")
        print(f"{GREEN}✓ MIGRACIÓN COMPLETADA EXITOSAMENTE{RESET}")
        print(f"{GREEN}{'='*60}{RESET}\n")
        print(f"{YELLOW}Próximos pasos:{RESET}")
        print("1. Actualizar variables de entorno en Vercel")
        print("2. Verificar delegación DNS de cubansaas.tech")
        print("3. Redesplegar aplicación")
        print("4. Probar endpoint simple: /api/csaas-simple-provision")
    else:
        print(f"\n{RED}{'='*60}{RESET}")
        print(f"{RED}✗ MIGRACIÓN INCOMPLETA{RESET}")
        print(f"{RED}{'='*60}{RESET}\n")
        print(f"{YELLOW}Revisa los errores arriba y corrige los archivos indicados{RESET}")

def main():
    print_header("VERIFICACIÓN DE MIGRACIÓN A CUBANSAAS.TECH")
    
    results = {
        ".env.example": check_env_example(),
        "api/config.py": check_config_py(),
        "api/proxy.py": check_proxy_py(),
        "api/csaas-provision.py": check_csaas_provision_py(),
        "api/csaas-simple-provision.py": check_csaas_simple_provision_py(),
        "Frontend Form": check_frontend_form(),
        "Frontend Result": check_frontend_result(),
        "Documentación": check_documentation(),
    }
    
    print_summary(results)
    
    # Exit code
    sys.exit(0 if all(results.values()) else 1)

if __name__ == "__main__":
    main()
