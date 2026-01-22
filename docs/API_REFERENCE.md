# 📡 Referencia de API

Documentación completa de todos los endpoints de la API del Sistema de Protección Perimetral.

## 🌐 Base URL

**Desarrollo:** `http://localhost:3000`  
**Producción:** `https://tu-dominio.vercel.app`

---

## 🔐 Autenticación

Las APIs utilizan Cloudflare Turnstile para validación anti-bot en endpoints públicos.

**Headers requeridos:**
```http
Content-Type: application/json
```

---

## 📋 Endpoints

### 1. Solicitar Protección

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

**Errores:**
- `400` - Datos inválidos o faltantes
- `403` - Token Turnstile inválido
- `500` - Error interno del servidor

---

### 2. Control de Protección

Obtiene el estado o activa/desactiva protecciones.

#### 2.1 Obtener Estado

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

#### 2.2 Activar/Desactivar Protección

**Endpoint:** `POST /api/toggle-protection`

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
- `500` - Error al aplicar protecciones

---

### 3. Verificación de Delegación DNS

Verifica si un dominio está delegado correctamente a Cloudflare.

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
  "timestamp": "2026-01-22T10:30:00Z"
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
  "timestamp": "2026-01-22T10:30:00Z"
}
```

**Errores:**
- `400` - Dominio no proporcionado o inválido
- `500` - Error al verificar delegación

---

### 4. Diagnóstico

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

## 🔒 Seguridad

### Validaciones Implementadas

1. **Turnstile:** Validación anti-bot en solicitudes públicas
2. **Formato de Dominio:** Validación de formato DNS válido
3. **Zona:** Verificación de que el dominio pertenece a la zona configurada
4. **CORS:** Configurado para orígenes permitidos
5. **Rate Limiting:** (Futuro) Límite de peticiones por IP

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
