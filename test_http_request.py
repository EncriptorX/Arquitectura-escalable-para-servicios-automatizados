#!/usr/bin/env python3
"""
Test de petición HTTP real al endpoint
"""
import json
import urllib.request
import urllib.error

# Datos de prueba
test_data = {
    "client_name": "Test Corporation",
    "client_id": "TEST-001",
    "urls": ["app.test.com", "api.test.com"]
}

print("Probando petición HTTP al endpoint...")
print("="*60)
print(f"Datos: {json.dumps(test_data, indent=2)}")
print("="*60)

try:
    # Intentar conectar al servidor local
    url = "http://localhost:5173/api/csaas-provision"
    headers = {"Content-Type": "application/json"}
    data = json.dumps(test_data).encode('utf-8')
    
    req = urllib.request.Request(url, data=data, headers=headers, method='POST')
    
    print(f"\nEnviando POST a {url}...")
    
    with urllib.request.urlopen(req, timeout=300) as response:
        result = json.loads(response.read().decode('utf-8'))
        print(f"\n✓ Respuesta exitosa (HTTP {response.status})")
        print(f"\nResultado:")
        print(json.dumps(result, indent=2))

except urllib.error.HTTPError as e:
    print(f"\n✗ Error HTTP {e.code}: {e.reason}")
    try:
        error_body = json.loads(e.read().decode('utf-8'))
        print(f"\nDetalles del error:")
        print(json.dumps(error_body, indent=2))
    except:
        print(f"No se pudo parsear el cuerpo del error")

except urllib.error.URLError as e:
    print(f"\n✗ Error de conexión: {e.reason}")
    print(f"\n⚠️ Asegúrate de que el servidor esté corriendo:")
    print(f"   npm run dev")

except Exception as e:
    print(f"\n✗ Error: {str(e)}")
    import traceback
    traceback.print_exc()
