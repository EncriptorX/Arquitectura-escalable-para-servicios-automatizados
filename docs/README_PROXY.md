# CSaaS con Proxy Inteligente - Plan Gratuito de Cloudflare

## 🎯 Objetivo

Implementar un sistema CSaaS (Cloudflare as a Service) completamente funcional usando el **plan gratuito de Cloudflare**, sin depender de `custom_origin_server` ni `custom_origin_sni` (no disponibles en plan Free).

## 🏗️ Arquitectura

### Flujo Completo

```
┌─────────────┐
│   Cliente   │
│  Final      │
└──────┬──────┘
       │
       │ 1. Accede a cliente-abc123.suncarsrl.com
       ▼
┌─────────────────────────────────┐
│  Cloudflare CDN + Protección    │
│  - WAF                          │
│  - DDoS Protection              │
│  - SSL/TLS                      │
│  - Bot Fight Mode               │
└──────┬──────────────────────────┘
       │
       │ 2. Request llega al backend
       ▼
┌─────────────────────────────────┐
│  Backend Proxy (api/proxy.py)   │
│  - Lee header Host              │
│  - Identifica subdominio        │
│  - Busca en mapa: subdomain →   │
│    dominio_real                 │
└──────┬──────────────────────────┘
       │
       │ 3. Reenvía a dominio real
       ▼
┌─────────────────────────────────┐
│  Servidor del Cliente           │
│  www.cliente.com                │
└─────────────────────────────────┘
```

## 📁 Estructura de Archivos

### Backend (Python)

```
api/
├── csaas-provision.py    # Provisionamiento de clientes (SIN custom_origin_*)
├── proxy.py              # Backend proxy reverso HTTP/HTTPS (NUEVO)
├── csaas-list.py         # Lista de clientes y mapeos (NUEVO)
├── config.py             # Configuración con CSaaSConfig
└── ...
```

### Frontend (React)

```
src/components/
├── CSaaSRequestForm.tsx  # Formulario de solicitud (actualizado)
├── CSaaSResultPage.tsx   # Página de resultado con instrucciones DNS (actualizado)
└── ...
```

### Documentación

```
├── ARQUITECTURA_PROXY.md      # Arquitectura completa
├── CAMBIOS_ARQUITECTURA.md    # Resumen de cambios
├── README_PROXY.md            # Este archivo
└── scripts/
    └── test_proxy_architecture.py  # Tests de la arquitectura
```

## 🚀 Instalación y Configuración

### 1. Instalar Dependencias

```bash
# Backend
pip install -r requirements.txt

# Frontend
npm install
```

### 2. Configurar Variables de Entorno

Crear archivo `.env`:

```env
# Cloudflare API
CF_API_TOKEN=tu_token_de_cloudflare
CF_ZONE_ID=tu_zone_id

# Cloudflare for SaaS
CSAAS_ZONE=suncarsrl.com
CSAAS_CNAME_TARGET=customers.suncarsrl.com

# Turnstile (opcional)
TURNSTILE_SECRET_KEY=tu_turnstile_secret

# Admin API Key (endpoints administrativos)
ADMIN_API_KEY=tu_admin_api_key

# Host allowlist (coma-separados)
ALLOWED_HOSTS=localhost,127.0.0.1,*.vercel.app
```

### 3. Ejecutar Tests

```bash
python scripts/test_proxy_architecture.py
```

**Salida esperada**:
```
✅ PASS - Imports
✅ PASS - Generación de Subdominios
✅ PASS - Mapeo del Proxy
✅ PASS - Configuración CSaaS
✅ PASS - Payload Custom Hostname
✅ PASS - Integración Completa

RESULTADO FINAL: 6/6 tests pasados
🎉 ¡Todos los tests pasaron exitosamente!
```

### 4. Ejecutar en Desarrollo

```bash
# Backend (Vercel Dev)
vercel dev

# Frontend (Vite)
npm run dev
```

## 📝 Uso del Sistema

### 1. Provisionar un Cliente

**Endpoint**: `POST /api/csaas-provision`

**Request**:
```json
{
  "client_name": "Acme Corporation",
  "client_id": "CLI-12345",
  "urls": ["www.acme.com", "app.acme.com"]
}
```

**Response**:
```json
{
  "status": "ok",
  "message": "Cliente provisionado exitosamente en CSaaS",
  "subdomain": "acmecorporation-abc123.suncarsrl.com",
  "protected_url": "https://acmecorporation-abc123.suncarsrl.com",
  "custom_hostname_id": "ch_abc123xyz",
  "origin_urls": ["www.acme.com", "app.acme.com"],
  "security_rules": {
    "waf": true,
    "https_redirect": true,
    "security_level": true,
    "bot_fight_mode": true
  }
}
```

### 2. Listar Clientes Provisionados

**Endpoint**: `GET /api/csaas-list`

**Response**:
```json
{
  "status": "ok",
  "total_clients": 1,
  "clients": [
    {
      "client_key": "CLI-12345",
      "client_name": "Acme Corporation",
      "subdomain": "acmecorporation-abc123.suncarsrl.com",
      "protected_url": "https://acmecorporation-abc123.suncarsrl.com",
      "origin_urls": ["www.acme.com"],
      "status": "active"
    }
  ],
  "proxy_map": {
    "acmecorporation-abc123.suncarsrl.com": "www.acme.com"
  }
}
```

### 3. Configuración DNS del Cliente

Para que el cliente mantenga su dominio original:

```
Tipo: CNAME
Nombre: www (o @ para dominio raíz)
Valor: acmecorporation-abc123.suncarsrl.com
TTL: 3600
```

**Resultado**: `www.acme.com` → `acmecorporation-abc123.suncarsrl.com` → Proxy → `www.acme.com`

## 🔧 Componentes Clave

### 1. Custom Hostname (Sin custom_origin_*)

**Archivo**: `api/csaas-provision.py`

```python
# Payload SIN custom_origin_server ni custom_origin_sni
payload = {
    "hostname": hostname,
    "ssl": {
        "method": "http",  # DV por HTTP
        "type": "dv",
        "settings": {
            "http2": "on",
            "min_tls_version": "1.2",
            "tls_1_3": "on"
        }
    }
    # ✅ NO incluir custom_origin_server
    # ✅ NO incluir custom_origin_sni
}
```

### 2. Backend Proxy

**Archivo**: `api/proxy.py`

```python
# Mapa en memoria: subdominio → dominio_real
ProxyConfig.SUBDOMAIN_MAP = {
    "cliente-abc123.suncarsrl.com": "www.cliente.com"
}

# Flujo del proxy
def _handle_proxy_request(self):
    # 1. Leer header Host
    host = self.headers.get('Host')
    
    # 2. Extraer subdominio
    subdomain = extract_subdomain(host)
    
    # 3. Obtener dominio real
    origin_url = get_origin_for_subdomain(subdomain)
    
    # 4. Reenviar request
    status, headers, body = forward_request(
        method=self.command,
        origin_url=origin_url,
        path=self.path,
        headers=dict(self.headers),
        body=body
    )
    
    # 5. Devolver respuesta
    self._send_response(status, headers, body)
```

### 3. Almacenamiento en Memoria

**Archivo**: `api/config.py`

```python
class CSaaSConfig:
    """Configuración y almacenamiento para CSaaS"""
    PROVISIONED_CLIENTS = {}  # {client_id: {subdomain, urls, status}}
```

## ✅ Ventajas de Esta Arquitectura

### Compatible con Plan Gratuito
- ✅ No usa `custom_origin_server` (no disponible en Free)
- ✅ No usa `custom_origin_sni` (no disponible en Free)
- ✅ Solo usa Custom Hostnames básicos

### Mínima Intervención del Cliente
- ✅ Solo requiere un cambio DNS tipo CNAME
- ✅ No necesita modificar su servidor de origen
- ✅ No necesita instalar certificados SSL

### Protección Completa
- ✅ WAF activado
- ✅ SSL/TLS automático (DV por HTTP)
- ✅ DDoS protection
- ✅ Bot Fight Mode
- ✅ Rate limiting básico
- ✅ Browser Integrity Check

### Defendible Académicamente
- ✅ Arquitectura clara y documentada
- ✅ Solución real a limitaciones del plan gratuito
- ✅ Implementación completa y funcional
- ✅ Código limpio y comentado

## ⚠️ Limitaciones Conocidas

### Almacenamiento en Memoria
**Problema**: Los mapeos se pierden al reiniciar el servidor.

**Solución Futura**: Implementar base de datos (Supabase, PostgreSQL, etc.)

### Latencia Adicional
**Problema**: El proxy agrega un salto adicional (~50-200ms).

**Mitigación**: Usar CDN de Cloudflare para cachear contenido estático.

## 🧪 Testing

### Test Manual

```bash
# 1. Provisionar cliente
curl -X POST http://localhost:5173/api/csaas-provision \
  -H "Content-Type: application/json" \
  -d '{
    "client_name": "Test Client",
    "urls": ["example.com"]
  }'

# 2. Listar clientes
curl http://localhost:5173/api/csaas-list

# 3. Probar proxy (simular request con Host header)
curl -H "Host: testclient-abc123.suncarsrl.com" \
  http://localhost:5173/api/proxy
```

### Test Automatizado

```bash
python scripts/test_proxy_architecture.py
```

## 📚 Documentación Adicional

- **ARQUITECTURA_PROXY.md**: Arquitectura completa con diagramas
- **CAMBIOS_ARQUITECTURA.md**: Resumen de todos los cambios realizados
- **docs/**: Documentación técnica adicional

## 🎓 Justificación Académica

Esta arquitectura es defendible académicamente porque:

1. **Identifica una limitación real**: El plan gratuito de Cloudflare no incluye `custom_origin_server`

2. **Propone una solución viable**: Backend proxy inteligente que maneja el reenvío

3. **Implementa la solución completamente**: Código funcional y testeado

4. **Documenta el proceso**: Arquitectura clara, código comentado, tests

5. **Mantiene los objetivos**: Protección perimetral con mínima intervención del cliente

## 🚀 Próximos Pasos

### Corto Plazo
- [ ] Implementar base de datos para persistencia
- [ ] Agregar autenticación y autorización
- [ ] Implementar dashboard de administración
- [ ] Agregar métricas y logs

### Mediano Plazo
- [ ] Optimizar latencia del proxy
- [ ] Implementar caché en el proxy
- [ ] Agregar health checks del origin
- [ ] Implementar failover

### Largo Plazo
- [ ] Migrar a plan Business de Cloudflare (si es necesario)
- [ ] Implementar multi-tenancy completo
- [ ] Agregar facturación y gestión de clientes
- [ ] Escalar infraestructura

## 📞 Soporte

Para preguntas o problemas:
1. Revisar la documentación en `ARQUITECTURA_PROXY.md`
2. Ejecutar los tests: `python scripts/test_proxy_architecture.py`
3. Revisar los logs del servidor

## 📄 Licencia

Este proyecto es parte de una tesis académica.

---

**Nota**: Esta arquitectura está optimizada para el plan gratuito de Cloudflare. Para producción a gran escala, se recomienda migrar a un plan Business o Enterprise que incluya `custom_origin_server` y otras características avanzadas.
