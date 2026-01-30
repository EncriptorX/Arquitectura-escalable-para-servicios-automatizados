# 🔧 Fix: Host no autorizado - cubansaas.tech

## ❌ Error Original

```
Host no autorizado
POST https://cubansaas.tech/api/csaas-provision 400 (Bad Request)
```

## 🎯 Causa del Error

El dominio `cubansaas.tech` (sin subdominio) no estaba en la lista de hosts permitidos.

### Configuración Problemática

```python
_DEFAULT_ALLOWED_HOSTS = [
    "localhost",
    "127.0.0.1",
    "::1",
    "*.vercel.app",
    "*.cubansaas.tech"  # ❌ Solo subdominios, no el dominio raíz
]
```

**Problema:** El patrón `*.cubansaas.tech` coincide con:
- ✅ `www.cubansaas.tech`
- ✅ `api.cubansaas.tech`
- ✅ `cliente-abc.cubansaas.tech`
- ❌ `cubansaas.tech` (dominio raíz)

---

## ✅ Solución Aplicada

He agregado el dominio raíz `cubansaas.tech` a la lista de hosts permitidos.

### Configuración Corregida

```python
_DEFAULT_ALLOWED_HOSTS = [
    "localhost",
    "127.0.0.1",
    "::1",
    "*.vercel.app",
    "cubansaas.tech",      # ✅ Dominio raíz
    "*.cubansaas.tech"     # ✅ Subdominios
]
```

**Ahora coincide con:**
- ✅ `cubansaas.tech` (dominio raíz)
- ✅ `www.cubansaas.tech`
- ✅ `cliente-abc.cubansaas.tech`
- ✅ Cualquier subdominio de cubansaas.tech

---

## 📝 Cambios Realizados

### 1. Archivo: `api/config.py`

```python
# Antes
_DEFAULT_ALLOWED_HOSTS = [
    "localhost",
    "127.0.0.1",
    "::1",
    "*.vercel.app",
    "*.cubansaas.tech"
]

# Después
_DEFAULT_ALLOWED_HOSTS = [
    "localhost",
    "127.0.0.1",
    "::1",
    "*.vercel.app",
    "cubansaas.tech",      # ✅ Agregado
    "*.cubansaas.tech"
]
```

### 2. Archivo: `.env.example`

```bash
# Antes
ALLOWED_HOSTS=localhost,127.0.0.1,*.vercel.app

# Después
ALLOWED_HOSTS=localhost,127.0.0.1,*.vercel.app,cubansaas.tech,*.cubansaas.tech
```

---

## 🔧 Configuración en Vercel

### Opción 1: Usar Valores por Defecto (Recomendado)

**No configurar** la variable `ALLOWED_HOSTS` en Vercel. El código usará automáticamente los valores por defecto que incluyen `cubansaas.tech`.

### Opción 2: Configurar Explícitamente

Si prefieres configurar explícitamente en Vercel:

```bash
# En Vercel Dashboard → Settings → Environment Variables
ALLOWED_HOSTS=localhost,127.0.0.1,*.vercel.app,cubansaas.tech,*.cubansaas.tech
```

**Recomendación:** Usa la Opción 1 (valores por defecto) para simplificar.

---

## 🚀 Deployment

Haz push de los cambios:

```bash
git add api/config.py .env.example
git commit -m "Fix: Agregar cubansaas.tech a hosts permitidos"
git push origin main
```

### Resultado Esperado

```
✅ Build exitoso
✅ cubansaas.tech permitido
✅ Formulario CSaaS funcionando
✅ Sin error "Host no autorizado"
```

---

## 🧪 Verificación

### 1. Verificar Hosts Permitidos

El código ahora permite:

```
✅ localhost (desarrollo local)
✅ 127.0.0.1 (desarrollo local)
✅ *.vercel.app (preview deployments)
✅ cubansaas.tech (dominio raíz)
✅ *.cubansaas.tech (subdominios)
```

### 2. Probar el Formulario

1. Ve a https://cubansaas.tech
2. Haz clic en "Solicitar Protección CSaaS"
3. Llena el formulario con datos de prueba
4. Envía la solicitud
5. Debería funcionar sin error 400

### 3. Probar con cURL

```bash
# Probar endpoint
curl -X POST https://cubansaas.tech/api/csaas-provision \
  -H "Content-Type: application/json" \
  -H "Host: cubansaas.tech" \
  -d '{
    "client_name": "Test Client",
    "urls": ["example.com"]
  }'

# Debería retornar JSON válido (no "Host no autorizado")
```

---

## 📊 Comparación

### ❌ Antes (Con Error)

```python
ALLOWED_HOSTS = ["*.cubansaas.tech"]

# Requests:
cubansaas.tech → ❌ Host no autorizado
www.cubansaas.tech → ✅ Permitido
cliente.cubansaas.tech → ✅ Permitido
```

### ✅ Después (Corregido)

```python
ALLOWED_HOSTS = ["cubansaas.tech", "*.cubansaas.tech"]

# Requests:
cubansaas.tech → ✅ Permitido
www.cubansaas.tech → ✅ Permitido
cliente.cubansaas.tech → ✅ Permitido
```

---

## 🎓 Lección Aprendida

### Problema

El patrón wildcard `*.dominio.com` no coincide con el dominio raíz `dominio.com`.

### Causa

Los patrones wildcard en hosts solo coinciden con subdominios, no con el dominio base.

### Solución

Agregar explícitamente el dominio raíz además del patrón wildcard:
```python
["dominio.com", "*.dominio.com"]
```

### Prevención

Al configurar hosts permitidos, siempre incluir:
- El dominio raíz: `dominio.com`
- Los subdominios: `*.dominio.com`

---

## 🔍 Cómo Funciona la Validación

### Código de Validación

```python
def is_host_allowed(host: str) -> bool:
    """Verifica si un host está permitido"""
    allowed = {h.strip().lower() for h in os.getenv("ALLOWED_HOSTS", "").split(",") if h.strip()}
    normalized = (host or "").split(":")[0].strip().lower()
    vercel_url = os.getenv("VERCEL_URL", "").strip().lower()
    
    # Si no hay ALLOWED_HOSTS en env, usar valores por defecto
    if not allowed:
        allowed = set(_DEFAULT_ALLOWED_HOSTS)
    
    # Verificar coincidencia exacta o wildcard
    return bool(normalized and (
        normalized in allowed or 
        (vercel_url and normalized == vercel_url) or
        any(pattern.startswith("*") and normalized.endswith(pattern[1:]) for pattern in allowed)
    ))
```

### Ejemplos de Coincidencia

```python
# Host: "cubansaas.tech"
# Allowed: ["cubansaas.tech", "*.cubansaas.tech"]

"cubansaas.tech" in allowed → ✅ True (coincidencia exacta)

# Host: "www.cubansaas.tech"
# Allowed: ["cubansaas.tech", "*.cubansaas.tech"]

"www.cubansaas.tech".endswith(".cubansaas.tech") → ✅ True (wildcard)
```

---

## ✅ Checklist

- [x] Agregado `cubansaas.tech` a `_DEFAULT_ALLOWED_HOSTS`
- [x] Actualizado `.env.example`
- [x] Documentación creada
- [ ] Push a GitHub
- [ ] Verificar deployment exitoso
- [ ] Probar formulario en producción
- [ ] Verificar que no hay error "Host no autorizado"

---

## 🆘 Si Aún Hay Problemas

### Verificar Variable de Entorno en Vercel

Si configuraste `ALLOWED_HOSTS` manualmente en Vercel, asegúrate de que incluya `cubansaas.tech`:

```bash
# En Vercel Dashboard → Settings → Environment Variables
ALLOWED_HOSTS=localhost,127.0.0.1,*.vercel.app,cubansaas.tech,*.cubansaas.tech
```

### Ver Logs

```bash
# Ver logs en tiempo real
vercel logs --follow

# Buscar mensajes de "Host no autorizado"
```

### Verificar Header Host

```bash
# Ver qué host se está enviando
curl -v https://cubansaas.tech/api/csaas-provision

# Buscar línea:
# > Host: cubansaas.tech
```

---

**Estado:** ✅ Error Corregido  
**Archivos:** api/config.py, .env.example  
**Listo para:** Deployment
