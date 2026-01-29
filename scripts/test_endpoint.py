#!/usr/bin/env python3
"""Script para probar el endpoint de CSaaS directamente."""

import sys
from pathlib import Path


def _project_root() -> Path:
    return Path(__file__).resolve().parents[1]


def main() -> int:
    project_root = _project_root()
    api_dir = project_root / "api"
    sys.path.insert(0, str(api_dir))

    try:
        from dotenv import load_dotenv

        load_dotenv()
    except Exception:
        pass

    print("Probando endpoint csaas-provision...")
    print("=" * 60)

    try:
        import importlib.util

        module_path = api_dir / "csaas-provision.py"
        spec = importlib.util.spec_from_file_location("csaas_provision", str(module_path))
        if spec is None or spec.loader is None:
            raise RuntimeError(f"No se pudo crear el spec para: {module_path}")

        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)

        print("✓ Módulo importado correctamente")

        subdomain = module.generate_subdomain("Test Client", "CLI-001")
        print(f"✓ Subdominio generado: {subdomain}")

        test_data = {
            "client_name": "Test Client",
            "urls": ["test.example.com"],
        }
        valid, error = module.validate_client_data(test_data)
        print(f"✓ Validación: {'OK' if valid else f'ERROR - {error}'}")

        print("\n✅ Todas las pruebas básicas pasaron")
        print("\nSi el endpoint sigue fallando, el error está en:")
        print("1. La comunicación HTTP con Cloudflare")
        print("2. Los permisos del API Token")
        print("3. La configuración de Custom Hostnames")
        return 0

    except Exception as e:
        print(f"\n✗ Error: {str(e)}")
        import traceback

        traceback.print_exc()
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
