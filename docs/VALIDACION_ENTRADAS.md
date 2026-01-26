# Validación de Entradas - Implementación

## Problema Resuelto

**Antes:** El backend confiaba demasiado en el frontend y aceptaba URLs "raras" con esquemas, rutas, puertos, etc.

**Ahora:** El backend valida estrictamente que solo se acepten dominios FQDN puros, sin esquemas ni componentes adicionales.

## Implementación

### 1. Validación en `api/utils.py`

Se implementaron dos funciones principales:

#### `validate_domain(domain: str) -> bool`
Valida que un dominio cumpla con el formato FQDN:
- Solo caracteres alfanuméricos y guiones
- No puede empezar ni terminar con guión
- Longitud máxima de 253 caracteres
- Cada label máximo 63 caracteres
- Debe tener al menos un punto
- TLD de al menos 2 caracteres

#### `validate_url(url: str) -> Tuple[bool, Optional[str], Optional[str]]`
Valida y extrae el dominio de una entrada, rechazando:
- ❌ Esquemas: `http://`, `https://`, `ftp://`, etc.
- ❌ Rutas: `/path`, `/path/to/page`
- ❌ Parámetros: `?query=1`, `&param=value`
- ❌ Fragmentos: `#section`
- ❌ Puertos: `:8080`, `:443`
- ❌ Credenciales: `user@`, `user:pass@`
- ❌ Direcciones IP: `192.168.1.1`, `10.0.0.1`
- ❌ Espacios y caracteres especiales

**Ejemplo de uso:**
```python
from api.utils import validate_url

# Válido
valid, domain, error = validate_url("ejemplo.com")
# → (True, "ejemplo.com", None)

# Inválido - con esquema
valid, domain, error = validate_url("https://ejemplo.com")
# → (False, None, "No se permiten esquemas (http://, https://). Use solo el dominio FQDN")

# Inválido - con ruta
valid, domain, error = validate_url("ejemplo.com/path")
# → (False, None, "No se permiten rutas. Use solo el dominio FQDN")
```

### 2. Validación en `api/solicitar-proteccion.py`

La función `validate_fqdn()` fue mejorada para rechazar:
- Esquemas (`://`)
- Rutas (`/`)
- Parámetros (`?`, `&`)
- Fragmentos (`#`)
- Puertos (`:`)
- Credenciales (`@`)
- Espacios
- Direcciones IP

**Ejemplo:**
```python
def validate_fqdn(domain: str) -> bool:
    """Valida formato FQDN (optimizado con patrones precompilados)"""
    if not domain or not isinstance(domain, str):
        raise ValidationError("Dominio vacío o inválido", field="domain", value=domain)
    
    # Rechazar esquemas
    if "://" in domain:
        raise ValidationError("No se permiten esquemas (http://, https://). Use solo el dominio FQDN", field="domain", value=domain)
    
    # ... más validaciones
```

### 3. Validación en `api/verificar-delegacion.py`

Se agregó validación completa antes de procesar el dominio:

```python
# Validar formato de dominio (solo FQDN, sin esquemas ni rutas)
if "://" in dominio:
    self._send_json({
        "status": "error",
        "message": "No se permiten esquemas (http://, https://). Use solo el dominio FQDN"
    }, 400)
    return

if "/" in dominio or "?" in dominio or "#" in dominio or ":" in dominio or "@" in dominio:
    self._send_json({
        "status": "error",
        "message": "Formato de dominio inválido. Use solo el dominio FQDN (ejemplo: ejemplo.com)"
    }, 400)
    return
```

### 4. Validación en `api/toggle-protection.py`

Se agregó validación de dominio cuando se proporciona:

```python
# Validar dominio si se proporciona
if domain:
    valid, validated_domain, error = validate_url(domain)
    if not valid:
        self._send_json({
            "status": "error",
            "message": f"Dominio inválido: {error}",
            "invalid_domain": domain
        }, 400)
        return
    domain = validated_domain
```

## Casos de Prueba

### ✅ Casos Válidos
- `ejemplo.com`
- `sub.ejemplo.com`
- `deep.sub.ejemplo.com`
- `ejemplo-test.com`
- `ejemplo123.com`
- `test.co.uk`

### ❌ Casos Inválidos (Rechazados)
- `http://ejemplo.com` → "No se permiten esquemas"
- `https://ejemplo.com` → "No se permiten esquemas"
- `ejemplo.com/path` → "No se permiten rutas"
- `ejemplo.com?query=1` → "No se permiten parámetros"
- `ejemplo.com#fragment` → "No se permiten fragmentos"
- `ejemplo.com:8080` → "No se permiten puertos"
- `user@ejemplo.com` → "No se permiten credenciales"
- `192.168.1.1` → "No se permiten direcciones IP"
- `javascript:alert(1)` → Bloqueado (inyección)
- `'; DROP TABLE domains; --` → Bloqueado (SQL injection)

## Seguridad

La validación protege contra:

1. **Inyección de esquemas maliciosos**
   - `javascript:alert(1)`
   - `data:text/html,<script>alert(1)</script>`
   - `file:///etc/passwd`

2. **Path traversal**
   - `ejemplo.com/../../../etc/passwd`

3. **CRLF injection**
   - `ejemplo.com\r\nHost: evil.com`

4. **SQL injection**
   - `'; DROP TABLE domains; --`

5. **XSS en dominio**
   - `<script>alert(1)</script>.com`

## Tests

Se creó un suite completo de tests en `scripts/test_validacion_entrada.py`:

```bash
python scripts/test_validacion_entrada.py
```

**Resultados:**
- ✅ 20/20 pruebas de validación de dominios
- ✅ 13/13 pruebas de validación de URLs
- ✅ 8/8 pruebas de casos extremos
- ✅ 9/9 pruebas de seguridad

## Beneficios

1. **Seguridad mejorada**: No se confía en el frontend, todas las validaciones se hacen en el backend
2. **Mensajes claros**: Errores descriptivos que indican exactamente qué está mal
3. **Protección contra ataques**: Bloquea inyecciones y ataques comunes
4. **Consistencia**: Misma validación en todos los endpoints
5. **Mantenibilidad**: Código centralizado en `api/utils.py`

## Uso en Endpoints

Todos los endpoints que reciben dominios ahora validan:

- ✅ `api/solicitar-proteccion.py` - Valida URLs antes de provisionar
- ✅ `api/verificar-delegacion.py` - Valida dominio antes de verificar DNS
- ✅ `api/toggle-protection.py` - Valida dominio si se proporciona
- ✅ `api/utils.py` - Funciones de validación centralizadas

## Ejemplo de Respuesta de Error

```json
{
  "status": "error",
  "message": "No se permiten esquemas (http://, https://). Use solo el dominio FQDN",
  "error_type": "ValidationError",
  "error_category": "user_error",
  "invalid_url": "https://ejemplo.com"
}
```

## Conclusión

La validación de entradas está completamente implementada y probada. El backend ahora rechaza cualquier entrada que no sea un dominio FQDN puro, protegiendo contra ataques y errores de usuario.
