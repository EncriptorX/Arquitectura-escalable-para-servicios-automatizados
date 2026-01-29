# 📡 Referencia de API

Documentación completa de todos los endpoints de la API del Sistema de Protección Perimetral.

## 🌐 Base URL

**Desarrollo:** `http://localhost:3000`  
**Producción:** `https://tu-dominio.vercel.app`

---

## 🔐 Autenticación

Las APIs utilizan Cloudflare Turnstile para validación anti-bot en endpoints públicos.

Los endpoints administrativos requieren una clave adicional configurada en `ADMIN_API_KEY`.

**Headers requeridos:**
```http
Content-Type: application/json
```

**Headers administrativos (solo POST admin):**
```http
X-Admin-Key: <ADMIN_API_KEY>
# o
Authorization: Bearer <ADMIN_API_KEY>
```

---

## 📋 Endpoints

### 1. Control del Servicio

Permite activar o desactivar el servicio de protección globalmente.

#### 1.1 Obtener Estado del Servicio

**Endpoint:** `GET /api/toggle-service`

**Response (200 OK):**
```json
{
  "status": "ok",
  "service_enabled": true,
  "message": "Servicio habilitado"
}
```

#### 1.2 Activar/Desactivar Servicio

**Endpoint:** `POST /api/toggle-service`

**Requiere:** `ADMIN_API_KEY` en `X-Admin-Key` o `Authorization: Bearer`.

**Request Body:**
```json
{
  "enabled": true
}
```

**Response (200 OK):**
```json
{
  "status": "ok",
  "service_enabled": true,
  "message": "Servicio habilitado exitosamente",
  "previous_state": false
}
```

**Errores:**
- `400` - Parámetro 'enabled' faltante o inválido
- `403` - No autorizado (ADMIN_API_KEY faltante o incorrecta)
- `500` - Error interno del servidor

**Notas:**
- Cuando el servicio está deshabilitado, el endpoint `/api/solicitar-proteccion` retornará error 503
- El estado del servicio es global y afecta a todas las solicitudes
- El estado se mantiene en memoria (se reinicia al reiniciar el servidor)

---

### 2. Solicitar Protección

Configura protección perimetral completa para uno o más dominios.

**Endpoint:** `POST /api/solicitar-proteccion`

**Request Body:**
```json
{
  "company": "string",
  "responsible": "string",
  "email": "string",
  "phone": "string (opcional)",
  "urls": ["string"],
  "comments": "string (opcional)",
  "turnstileToken": "string"
}
```

**Response (200 OK):**
```json
{
  "status": "ok",
  "message": "Protección perimetral configurada exitosamente",
  "urls": ["demo.tudominio.com"],
  "sitios": [{
    "dominio": "demo.tudominio.com",
    "estado": "Protección perimetral configurada",
    "nameservers": ["ns1.cloudflare.com", "ns2.cloudflare.com"],
    "origin_ip": "192.0.2.1"
  }],
  "logs": ["..."],
  "progress": 100,
  "nameservers": ["ns1.cloudflare.com", "ns2.cloudflare.com"],
  "simulation_mode": false
}
```

**Response (503 Service Unavailable) - Servicio Deshabilitado:**
```json
{
  "status": "error",
  "message": "El servicio está deshabilitado temporalmente",
  "service_disabled": true
}
```

**Response (403 Forbidden) - Turnstile Fallido:**
```json
{
  "status": "error",
  "message": "Solicitud no verificada - Verificación de seguridad fallida",
  "error_code": "TURNSTILE_VERIFICATION_FAILED",
  "detail": "Por favor, recarga la página e intenta nuevamente"
}
```

**Response (400 Bad Request) - Token Faltante:**
```json
{
  "status": "error",
  "message": "Falta el token de seguridad (Turnstile)",
  "error_code": "MISSING_TURNSTILE_TOKEN"
}
```

**Response (500 Internal Server Error) - Turnstile No Configurado:**
```json
{
  "status": "error",
  "message": "TURNSTILE_SECRET_KEY no está configurada",
  "error_code": "TURNSTILE_NOT_CONFIGURED"
}
```

**Códigos de Error:**
- `MISSING_TURNSTILE_TOKEN` - Token de Turnstile no proporcionado
- `TURNSTILE_VERIFICATION_FAILED` - Verificación de Turnstile fallida
- `TURNSTILE_NOT_CONFIGURED` - Turnstile no está configurado en el servidor

**Errores HTTP:**
- `400` - Datos inválidos o faltantes, token Turnstile no proporcionado
- `403` - Token Turnstile inválido o verificación fallida
- `503` - Servicio deshabilitado
- `500` - Error interno del servidor o Turnstile no configurado

**Estructura de Respuesta de Error:**
```json
{
  "status": "error",
  "message": "Mensaje amigable para el usuario",
  "error_type": "ValidationError",
  "error_category": "user_error",
  "error_code": "MISSING_TURNSTILE_TOKEN",
  "technical_message": "Detalles técnicos del error (opcional)"
}
```

**Tipos de Error (error_type):**
- `ValidationError` - Error de validación de entrada
- `AuthenticationError` - Error de autenticación
- `CloudflareAPIError` - Error de la API de Cloudflare
- `DNSError` - Error relacionado con DNS
- `DNSDelegationError` - Error de delegación DNS
- `DNSResolutionError` - Error de resolución DNS
- `NetworkError` - Error de red o conexión
- `TimeoutError` - Timeout en operación
- `ServiceDisabledError` - Servicio deshabilitado
- `ConfigurationError` - Error de configuración

**Categorías de Error (error_category):**
- `user_error` - Error causado por el usuario (400, 403)
- `cloudflare_error` - Error de Cloudflare (502)
- `dns_error` - Error de DNS (400)
- `network_error` - Error de red (503)
- `service_error` - Servicio no disponible (503)
- `configuration_error` - Error de configuración (500)
- `idempotent` - Operación idempotente (200)

**Notas de Seguridad:**
- Todas las solicitudes requieren un token válido de Cloudflare Turnstile
- El token se valida en el servidor antes de procesar la solicitud
- Los fallos de verificación se auditan con IP del cliente
- El widget de Turnstile se resetea automáticamente después de cada intento
- Todos los errores se registran en el sistema de logging estructurado

---

### 3. Control de Protección

Obtiene el estado o activa/desactiva protecciones.

#### 3.1 Obtener Estado

**Endpoint:** `GET /api/toggle-protection`

**Response (200 OK):**
```json
{
  "status": "ok",
  "protection_status": {
    "waf": true,
    "https_redirect": true,
    "security_level": "high",
    "firewall_rules": [{
      "id": "...",
      "description": "CAS Auto-Provisioned Block Rule",
      "action": "block",
      "enabled": true
    }],
    "overall_enabled": true
  },
  "logs": ["..."]
}
```

#### 3.2 Activar/Desactivar Protección

**Endpoint:** `POST /api/toggle-protection`

**Requiere:** `ADMIN_API_KEY` en `X-Admin-Key` o `Authorization: Bearer`.

**Request Body:**
```json
{
  "enable": true,
  "domain": "demo.tudominio.com"
}
```

**Response (200 OK):**
```json
{
  "status": "ok",
  "message": "Protecciones activadas exitosamente",
  "toggle_result": {
    "success": true,
    "results": {
      "waf": true,
      "https_redirect": true,
      "security_level": true,
      "firewall_rules": true,
      "dns_proxy": true
    },
    "logs": ["..."]
  },
  "protection_status": { "..." }
}
```

**Errores:**
- `400` - Parámetros inválidos
- `403` - No autorizado (ADMIN_API_KEY faltante o incorrecta)
- `500` - Error al aplicar protecciones

---

### 3. Verificación de Delegación DNS

Verifica si un dominio está delegado correctamente a Cloudflare usando verificación DNS real con dnspython.

#### 3.1 Health Check

**Endpoint:** `GET /api/verificar-delegacion`

**Response (200 OK):**
```json
{
  "status": "ok",
  "message": "API de verificación de delegación DNS funcionando",
  "has_cloudflare_config": true
}
```

#### 3.2 Verificar Dominio

**Endpoint:** `POST /api/verificar-delegacion`

**Request Body:**
```json
{
  "dominio": "demo.tudominio.com"
}
```

**Response - Delegado (200 OK):**
```json
{
  "status": "ok",
  "dominio": "demo.tudominio.com",
  "zona_cloudflare": "tudominio.com",
  "delegado": true,
  "puede_continuar": true,
  "nameservers_esperados": ["ns1.cloudflare.com", "ns2.cloudflare.com"],
  "nameservers_actuales": ["ns1.cloudflare.com", "ns2.cloudflare.com"],
  "mensaje": "✅ El dominio está correctamente delegado a Cloudflare",
  "timestamp": "2026-01-22T10:30:00Z",
  "verificacion_real": true
}
```

**Response - No Delegado (200 OK):**
```json
{
  "status": "ok",
  "dominio": "demo.tudominio.com",
  "delegado": false,
  "puede_continuar": false,
  "nameservers_esperados": ["ns1.cloudflare.com", "ns2.cloudflare.com"],
  "nameservers_actuales": ["ns1.registrador.com", "ns2.registrador.com"],
  "mensaje": "⏳ El dominio aún NO está delegado a Cloudflare",
  "timestamp": "2026-01-22T10:30:00Z",
  "verificacion_real": true
}
```

**Response - Error DNS (200 OK):**
```json
{
  "status": "error",
  "message": "El dominio 'ejemplo.com' no existe",
  "delegado": false,
  "puede_continuar": false,
  "nameservers_esperados": ["ns1.cloudflare.com", "ns2.cloudflare.com"],
  "nameservers_actuales": null,
  "verificacion_real": true
}
```

**Notas:**
- Usa `dns.resolver` (dnspython) para verificación DNS real
- Compara los NS actuales del dominio con los NS de Cloudflare
- Campo `verificacion_real: true` indica verificación con dnspython
- Campo `verificacion_real: false` indica método alternativo (fallback)
- Maneja errores DNS específicos (NXDOMAIN, NoAnswer, Timeout)

**Errores:**
- `400` - Dominio no proporcionado o inválido
- `500` - Error al verificar delegación

---

### 5. Estado del Dominio (NUEVO)

Consulta el estado actual de un dominio en Cloudflare. Demuestra evidencia técnica de idempotencia, recursos existentes y configuración actual.

#### 5.1 Health Check

**Endpoint:** `GET /api/status`

**Response (200 OK):**
```json
{
  "status": "ok",
  "message": "API de estado de dominio funcionando",
  "has_cloudflare_config": true
}
```

#### 5.2 Consultar Estado de Dominio

**Endpoint:** `POST /api/status`

**Request Body:**
```json
{
  "domain": "demo.tudominio.com"
}
```

**Response (200 OK):**
```json
{
  "status": "ok",
  "domain": "demo.tudominio.com",
  "timestamp": "2026-01-26T10:30:00Z",
  "zone": {
    "id": "abc123",
    "name": "tudominio.com",
    "status": "active",
    "paused": false,
    "type": "full",
    "name_servers": ["ns1.cloudflare.com", "ns2.cloudflare.com"],
    "created_on": "2026-01-20T10:00:00Z",
    "modified_on": "2026-01-26T09:00:00Z"
  },
  "dns_records": {
    "success": true,
    "exists": true,
    "count": 2,
    "records": [{
      "id": "rec123",
      "type": "A",
      "name": "demo.tudominio.com",
      "content": "192.0.2.1",
      "proxied": true,
      "ttl": 1,
      "created_on": "2026-01-26T09:00:00Z",
      "modified_on": "2026-01-26T09:00:00Z"
    }]
  },
  "security_settings": {
    "waf": {
      "value": "on",
      "modified_on": "2026-01-26T09:00:00Z",
      "editable": true
    },
    "ssl": {
      "value": "strict",
      "modified_on": "2026-01-26T09:00:00Z",
      "editable": true
    },
    "always_use_https": {
      "value": "on",
      "modified_on": "2026-01-26T09:00:00Z",
      "editable": true
    },
    "security_level": {
      "value": "high",
      "modified_on": "2026-01-26T09:00:00Z",
      "editable": true
    }
  },
  "firewall_rules": {
    "success": true,
    "total_rules": 5,
    "cas_rules": 1,
    "rules": [{
      "id": "rule123",
      "description": "CAS Auto-Provisioned Block Rule",
      "action": "block",
      "paused": false,
      "filter": "(ip.geoip.country eq \"XX\")",
      "created_on": "2026-01-26T09:00:00Z",
      "modified_on": "2026-01-26T09:00:00Z"
    }]
  },
  "evidence": {
    "idempotent": true,
    "protected": true,
    "proxied": true
  }
}
```

**Evidencia Técnica:**
- `idempotent: true` - Recursos ya existen (operación idempotente)
- `protected: true` - Protecciones de seguridad activas
- `proxied: true` - DNS está proxied a través de Cloudflare

**Notas:**
- Demuestra estado actual del dominio en Cloudflare
- Detecta recursos existentes (idempotencia)
- Muestra configuraciones de seguridad aplicadas
- Útil para verificar provisión exitosa
- Incluye timestamps de creación y modificación

**Errores:**
- `400` - Dominio no proporcionado
- `500` - Cloudflare no configurado o error interno

---

### 6. Diagnóstico

Muestra el estado de configuración del sistema.

**Endpoint:** `GET /api/diagnostico`

**Response (200 OK):**
```json
{
  "modo_actual": "REAL",
  "configuracion": {
    "CF_API_TOKEN": {
      "configurado": true,
      "preview": "1234567890...",
      "longitud": 40
    },
    "CF_ZONE_ID": {
      "configurado": true,
      "preview": "abcdef12...",
      "longitud": 32
    },
    "TURNSTILE_SECRET_KEY": {
      "configurado": true,
      "preview": "0x4AAAA...",
      "longitud": 40
    }
  },
  "estado": {
    "puede_validar_turnstile": true,
    "puede_aplicar_proteccion_real": true,
    "modo_simulacion_activo": false
  },
  "instrucciones": []
}
```

---

## 🔧 Códigos de Estado HTTP

| Código | Significado |
|--------|-------------|
| 200 | OK - Solicitud exitosa |
| 400 | Bad Request - Datos inválidos |
| 403 | Forbidden - Autenticación fallida |
| 500 | Internal Server Error - Error del servidor |

---

## 📝 Ejemplos de Uso

### JavaScript/TypeScript

```typescript
// Solicitar protección
const response = await fetch('/api/solicitar-proteccion', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    company: 'Mi Empresa',
    responsible: 'Juan Pérez',
    email: 'juan@empresa.com',
    urls: ['demo.tudominio.com'],
    turnstileToken: token
  })
});

const data = await response.json();
console.log(data);
```

### Python

```python
import requests

# Verificar delegación
response = requests.post(
    'https://tu-dominio.vercel.app/api/verificar-delegacion',
    json={'dominio': 'demo.tudominio.com'}
)

data = response.json()
print(data['delegado'])
```

### cURL

```bash
# Obtener estado de protección
curl -X GET https://tu-dominio.vercel.app/api/toggle-protection

# Activar protección
curl -X POST https://tu-dominio.vercel.app/api/toggle-protection \
  -H "Content-Type: application/json" \
  -d '{"enable": true, "domain": "demo.tudominio.com"}'
```

---

## 🚨 Manejo de Errores

Todas las APIs retornan errores en el siguiente formato:

```json
{
  "status": "error",
  "message": "Descripción del error",
  "details": "Información adicional (opcional)"
}
```

### Errores Comunes

**Token Turnstile Inválido:**
```json
{
  "status": "error",
  "message": "Verificación Turnstile fallida"
}
```

**Dominio Inválido:**
```json
{
  "status": "error",
  "message": "Formato de dominio inválido: ejemplo-invalido"
}
```

**Configuración Faltante:**
```json
{
  "status": "error",
  "message": "CF_API_TOKEN no está configurado"
}
```

---

## 🔧 Sistema de Excepciones Tipadas

El sistema implementa un manejo robusto de errores con excepciones tipadas que permiten distinguir entre diferentes tipos de errores.

### Jerarquía de Excepciones

```
BaseAPIError
├── ValidationError (400)
├── AuthenticationError (403)
├── CloudflareAPIError (502)
│   ├── CloudflareRateLimitError (429)
│   └── CloudflarePermissionError (403)
├── DNSError (400)
│   ├── DNSDelegationError
│   ├── DNSResolutionError
│   └── DNSRecordExistsError (200)
├── NetworkError (503)
│   └── TimeoutError
├── ConfigurationError (500)
├── ServiceDisabledError (503)
└── LogicError (500)
```

### Respuesta de Error Estructurada

Todas las excepciones retornan una respuesta estructurada:

```json
{
  "status": "error",
  "message": "Mensaje amigable para el usuario",
  "error_type": "ValidationError",
  "error_category": "user_error",
  "technical_message": "Detalles técnicos (opcional)"
}
```

### Categorías de Error

| Categoría | Descripción | Código HTTP |
|-----------|-------------|-------------|
| `user_error` | Errores causados por el usuario | 400, 403 |
| `cloudflare_error` | Errores de la API de Cloudflare | 502 |
| `dns_error` | Errores relacionados con DNS | 400 |
| `network_error` | Errores de conexión o timeout | 503 |
| `service_error` | Servicio no disponible | 503 |
| `configuration_error` | Error de configuración | 500 |
| `idempotent` | Operación idempotente (no es error) | 200 |

### Ejemplos de Errores

**ValidationError:**
```json
{
  "status": "error",
  "message": "El dominio no cumple con el formato FQDN válido",
  "error_type": "ValidationError",
  "error_category": "user_error",
  "details": {
    "field": "domain",
    "value": "invalid..domain"
  }
}
```

**CloudflareAPIError:**
```json
{
  "status": "error",
  "message": "Error comunicándose con Cloudflare",
  "error_type": "CloudflareAPIError",
  "error_category": "cloudflare_error",
  "details": {
    "cloudflare_error_code": 1001,
    "cloudflare_message": "Zone already exists"
  }
}
```

**DNSDelegationError:**
```json
{
  "status": "error",
  "message": "El dominio no está correctamente delegado a Cloudflare",
  "error_type": "DNSDelegationError",
  "error_category": "dns_error",
  "details": {
    "domain": "example.com",
    "expected_nameservers": ["ns1.cloudflare.com"],
    "actual_nameservers": ["ns1.registrar.com"]
  }
}
```

### Manejo en el Frontend

El frontend detecta automáticamente el tipo de error y muestra mensajes apropiados:

```typescript
if (result.error_category === "user_error") {
  setError(`❌ ${result.message}`);
} else if (result.error_category === "cloudflare_error") {
  setError(`⚠️ Error de Cloudflare: ${result.message}`);
} else if (result.error_category === "dns_error") {
  setError(`🌐 Error DNS: ${result.message}`);
}
```

---

## 🔒 Seguridad

### Validaciones Implementadas

1. **Turnstile:** Validación anti-bot en solicitudes públicas
2. **Formato de Dominio:** Validación de formato DNS válido
3. **Zona:** Verificación de que el dominio pertenece a la zona configurada
4. **CORS:** Bloqueado para terceros (`Access-Control-Allow-Origin: null`)
5. **Host:** Validación de `Host` contra allowlist
6. **Rate Limiting:** (Futuro) Límite de peticiones por IP

### Mejores Prácticas

- ✅ Usar HTTPS en producción
- ✅ No exponer credenciales en el frontend
- ✅ Validar todos los inputs
- ✅ Implementar rate limiting
- ✅ Monitorear logs de errores

---

## 📊 Rate Limits

**Actual:** Sin límites (desarrollo)

**Planeado para v1.1:**
- 10 solicitudes por minuto por IP
- 100 solicitudes por hora por IP
- 1000 solicitudes por día por IP

---

## 🔗 Enlaces Relacionados

- [Documentación de Cloudflare API](https://developers.cloudflare.com/api/)
- [Cloudflare Turnstile](https://developers.cloudflare.com/turnstile/)
- [Vercel Serverless Functions](https://vercel.com/docs/functions)

---

**Última actualización:** Enero 2026
