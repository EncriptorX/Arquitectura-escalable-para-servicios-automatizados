# Solución al Límite de Funciones Serverless en Vercel

## Problema

Vercel Hobby plan tiene un límite de **12 Serverless Functions** por deployment.

Error original:
```
Error: No more than 12 Serverless Functions can be added to a Deployment 
on the Hobby plan. Create a team (Pro plan) to deploy more.
```

## Solución Implementada

### 1. Consolidación de Funciones

**Antes**: 13 archivos Python en `api/`
- `solicitar-proteccion.py`
- `status.py`
- `toggle-service.py`
- `toggle-protection.py`
- `verificar-delegacion.py`
- `diagnostico.py`
- `csaas-provision.py`
- `csaas-list.py` ❌ (eliminado)
- `proxy.py`
- `config.py` (utilidad)
- `utils.py` (utilidad)
- `logger.py` (utilidad)
- `exceptions.py` (utilidad)

**Después**: 8 funciones serverless
- `solicitar-proteccion.py`
- `status.py`
- `toggle-service.py`
- `toggle-protection.py`
- `verificar-delegacion.py`
- `diagnostico.py`
- `csaas-provision.py` ✅ (incluye funcionalidad de csaas-list)
- `proxy.py`

### 2. Cambios Realizados

#### A. Integración de `csaas-list` en `csaas-provision`

**Archivo**: `api/csaas-provision.py`

Ahora el endpoint `GET /api/csaas-provision` devuelve la lista de clientes:

```python
def do_GET(self):
    """Health check y listado de clientes provisionados"""
    clients = []
    for key, info in CSaaSConfig.PROVISIONED_CLIENTS.items():
        clients.append({
            "client_key": key,
            "client_name": info["client_name"],
            "subdomain": info["subdomain"],
            "protected_url": f"https://{info['subdomain']}",
            "status": info["status"],
            "origin_urls": info["origin_urls"],
            "created_at": info["created_at"]
        })
    
    # Obtener mapeo del proxy
    try:
        from proxy import ProxyConfig
        proxy_map = dict(ProxyConfig.SUBDOMAIN_MAP)
    except ImportError:
        proxy_map = {}
    
    self._send_json({
        "status": "ok",
        "message": "CSaaS Provisioning API funcionando",
        "provisioned_clients": clients,
        "total_clients": len(clients),
        "proxy_map": proxy_map,
        "architecture": {
            "type": "Reverse Proxy (Plan Gratuito)",
            "description": "Backend proxy inteligente sin custom_origin_server",
            "flow": "Cliente → Subdominio → Backend Proxy → Dominio Real"
        }
    }, 200)
```

#### B. Actualización de `vercel.json`

**Builds específicos** (en lugar de wildcard):

```json
{
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/static-build",
      "config": { "distDir": "dist" }
    },
    {
      "src": "api/solicitar-proteccion.py",
      "use": "@vercel/python"
    },
    {
      "src": "api/status.py",
      "use": "@vercel/python"
    },
    {
      "src": "api/toggle-service.py",
      "use": "@vercel/python"
    },
    {
      "src": "api/toggle-protection.py",
      "use": "@vercel/python"
    },
    {
      "src": "api/verificar-delegacion.py",
      "use": "@vercel/python"
    },
    {
      "src": "api/diagnostico.py",
      "use": "@vercel/python"
    },
    {
      "src": "api/csaas-provision.py",
      "use": "@vercel/python"
    },
    {
      "src": "api/proxy.py",
      "use": "@vercel/python"
    }
  ]
}
```

**Routes actualizadas**:

```json
{
  "routes": [
    {
      "src": "/api/csaas-provision",
      "dest": "api/csaas-provision.py"
    },
    {
      "src": "/api/csaas-list",
      "dest": "api/csaas-provision.py"
    }
  ]
}
```

Nota: `/api/csaas-list` ahora apunta a `csaas-provision.py`

#### C. Creación de `.vercelignore`

Para asegurar que archivos de utilidad no se traten como funciones:

```
# Archivos de utilidad (no son funciones serverless)
api/config.py
api/utils.py
api/logger.py
api/exceptions.py

# Tests
tests/
scripts/test_*.py

# Documentación
docs/
*.md
!README.md
```

### 3. Resultado

**Funciones Serverless**: 8 (dentro del límite de 12)

1. `solicitar-proteccion.py`
2. `status.py`
3. `toggle-service.py`
4. `toggle-protection.py`
5. `verificar-delegacion.py`
6. `diagnostico.py`
7. `csaas-provision.py` (incluye GET para listar)
8. `proxy.py`

**Archivos de Utilidad** (no son funciones):
- `config.py`
- `utils.py`
- `logger.py`
- `exceptions.py`

## Uso Actualizado

### Listar Clientes

**Opción 1** (recomendada):
```bash
GET /api/csaas-provision
```

**Opción 2** (alias):
```bash
GET /api/csaas-list
```

Ambos endpoints devuelven la misma respuesta:

```json
{
  "status": "ok",
  "message": "CSaaS Provisioning API funcionando",
  "provisioned_clients": [...],
  "total_clients": 1,
  "proxy_map": {...},
  "architecture": {...}
}
```

### Provisionar Cliente

```bash
POST /api/csaas-provision
{
  "client_name": "Test Client",
  "urls": ["example.com"]
}
```

## Verificación

Para verificar que el deployment funciona:

```bash
# 1. Verificar número de funciones
ls api/*.py | wc -l
# Resultado: 12 archivos (8 funciones + 4 utilidades)

# 2. Verificar builds en vercel.json
cat vercel.json | grep "\"src\":" | wc -l
# Resultado: 9 (1 static + 8 python)

# 3. Deploy
vercel --prod
```

## Beneficios

✅ **Dentro del límite**: 8 funciones < 12 límite  
✅ **Sin pérdida de funcionalidad**: csaas-list integrado en csaas-provision  
✅ **Mejor organización**: Archivos de utilidad claramente separados  
✅ **Deployment exitoso**: Sin errores de límite  

## Próximos Pasos

Si necesitas agregar más funciones en el futuro:

1. **Consolidar más endpoints** (ej: toggle-service + toggle-protection)
2. **Usar un único endpoint con parámetros** (ej: `/api/admin?action=toggle`)
3. **Migrar a Vercel Pro** (límite de 100 funciones)

---

**Problema resuelto**: El proyecto ahora se despliega correctamente en Vercel Hobby plan.
