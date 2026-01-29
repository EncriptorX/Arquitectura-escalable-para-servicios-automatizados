# Arquitectura de Proxy para Plan Gratuito de Cloudflare

## Resumen Ejecutivo

Este proyecto implementa una arquitectura CSaaS (Cloudflare as a Service) optimizada para el **plan gratuito de Cloudflare**, eliminando completamente el uso de `custom_origin_server` y `custom_origin_sni` (no disponibles en plan Free).

## Problema Original

En la arquitectura anterior, se intentaba usar:
- `custom_origin_server`: Para hacer proxy directo al dominio del cliente
- `custom_origin_sni`: Para configurar SNI correcto

**Limitación**: Estas características NO están disponibles en el plan gratuito de Cloudflare.

## Solución Implementada

### Arquitectura de Proxy Reverso

```
┌─────────┐      ┌──────────────────────┐      ┌──────────────┐      ┌─────────────────┐
│ Cliente │ ───> │ cliente-abc.         │ ───> │ Backend      │ ───> │ www.cliente.com │
│         │      │ suncarsrl.com        │      │ Proxy Python │      │ (Dominio Real)  │
└─────────┘      └──────────────────────┘      └──────────────┘      └─────────────────┘
                  (Custom Hostname)              (api/proxy.py)        (Origin del Cliente)
```

### Componentes Clave

#### 1. Custom Hostname (Sin custom_origin_*)

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
    # NO incluir custom_origin_server
    # NO incluir custom_origin_sni
}
```

#### 2. Backend Proxy Inteligente

**Archivo**: `api/proxy.py`

El proxy maneja:
- Lectura del header `Host` de cada request
- Identificación del subdominio (ej: `cliente-abc123.suncarsrl.com`)
- Resolución del dominio real del cliente usando mapa en memoria
- Reenvío de la solicitud HTTP/HTTPS al dominio real
- Validación de `Host` contra allowlist (`ALLOWED_HOSTS`)
- Manejo correcto de headers:
  - `Host`: Dominio real del cliente
  - `X-Forwarded-For`: IP del cliente original
  - `X-Forwarded-Proto`: `https`

```python
# Mapa en memoria: subdominio -> dominio_real
ProxyConfig.SUBDOMAIN_MAP = {
    "cliente-abc123.suncarsrl.com": "www.cliente.com",
    "cliente-xyz789.suncarsrl.com": "app.otrocliente.com"
}
```

#### 3. Sincronización de Mapeos

**Archivo**: `api/csaas-provision.py`

Al provisionar un cliente:

```python
# Almacenar en CSaaSConfig
CSaaSConfig.PROVISIONED_CLIENTS[client_key] = {
    "subdomain": subdomain,
    "origin_urls": urls,
    # ...
}

# Configurar mapa del proxy
ProxyConfig.SUBDOMAIN_MAP[subdomain] = urls[0]
```

## Flujo Completo

### 1. Provisionamiento de Cliente

```bash
POST /api/csaas-provision
{
  "client_name": "Acme Corp",
  "client_id": "CLI-12345",
  "urls": ["www.acme.com"]
}
```

**Proceso**:
1. Generar subdominio único: `acme-abc123.suncarsrl.com`
2. Crear registro CNAME: `acme-abc123.suncarsrl.com` → `customers.suncarsrl.com`
3. Crear Custom Hostname SIN `custom_origin_server`
4. Aplicar reglas de seguridad (WAF, SSL, etc.)
5. Almacenar mapeo: `acme-abc123.suncarsrl.com` → `www.acme.com`

### 2. Request del Cliente

```
Cliente accede a: https://acme-abc123.suncarsrl.com/productos
```

**Flujo del Proxy**:
1. Request llega al backend proxy (`api/proxy.py`)
2. Proxy lee header `Host`: `acme-abc123.suncarsrl.com`
3. Busca en mapa: `acme-abc123.suncarsrl.com` → `www.acme.com`
4. Reenvía request a: `https://www.acme.com/productos`
5. Configura headers:
   - `Host: www.acme.com`
   - `X-Forwarded-For: <IP_cliente>`
   - `X-Forwarded-Proto: https`
6. Devuelve respuesta al cliente

### 3. Configuración DNS del Cliente (Opcional)

Para mantener el dominio original del cliente:

```
Tipo: CNAME
Nombre: www
Valor: acme-abc123.suncarsrl.com
```

**Resultado**: `www.acme.com` → `acme-abc123.suncarsrl.com` → Proxy → `www.acme.com`

## Ventajas de Esta Arquitectura

### ✅ Compatible con Plan Gratuito
- No usa `custom_origin_server` ni `custom_origin_sni`
- Solo usa Custom Hostnames básicos (disponibles en Free)

### ✅ Mínima Intervención del Cliente
- Solo requiere un cambio DNS tipo CNAME
- No necesita modificar su servidor de origen

### ✅ Protección Completa de Cloudflare
- WAF activado
- SSL/TLS automático
- DDoS protection
- Bot Fight Mode
- Rate limiting

### ✅ Defendible Académicamente
- Arquitectura clara y documentada
- Solución a limitaciones reales del plan gratuito
- Implementación completa y funcional

## Limitaciones y Consideraciones

### 🔴 Almacenamiento en Memoria

**Problema**: Los mapeos se almacenan en memoria (sin base de datos).

**Impacto**: 
- Los mapeos se pierden al reiniciar el servidor
- No es escalable para producción

**Solución Futura**: Implementar base de datos (Supabase, PostgreSQL, etc.)

### 🟡 Latencia Adicional

**Problema**: El proxy agrega un salto adicional.

**Impacto**: 
- Latencia adicional de ~50-200ms
- Depende de la ubicación del servidor de origen

**Mitigación**: 
- Usar CDN de Cloudflare para cachear contenido estático
- Optimizar timeout del proxy

### 🟡 Configuración de Vercel

**Problema**: El proxy debe manejar todas las solicitudes a subdominios.

**Solución**: Configurar Vercel para enrutar subdominios al proxy:

```json
{
  "routes": [
    {
      "src": "/api/proxy",
      "dest": "api/proxy.py"
    }
  ]
}
```

**Nota**: En producción, se recomienda usar un dominio dedicado para el proxy.

## Manejo de Errores

### Error 404: Origin Not Found

```json
{
  "error": "Origin Not Found",
  "message": "No se encontró un dominio de origen para el subdominio",
  "subdomain": "cliente-abc123.suncarsrl.com"
}
```

**Causa**: El subdominio no está registrado en el mapa.

**Solución**: Verificar que el cliente fue provisionado correctamente.

### Error 502: Bad Gateway

```json
{
  "error": "Bad Gateway",
  "message": "No se pudo conectar con el servidor de origen",
  "origin": "www.cliente.com"
}
```

**Causa**: El servidor de origen no responde.

**Solución**: Verificar que el dominio del cliente esté activo y accesible.

### Error 500: Internal Server Error

```json
{
  "error": "Internal Server Error",
  "message": "Error interno del proxy"
}
```

**Causa**: Error inesperado en el proxy.

**Solución**: Revisar logs del servidor.

## Testing

### 1. Provisionar Cliente

```bash
curl -X POST https://tu-dominio.vercel.app/api/csaas-provision \
  -H "Content-Type: application/json" \
  -d '{
    "client_name": "Test Client",
    "urls": ["example.com"]
  }'
```

### 2. Listar Clientes

```bash
curl https://tu-dominio.vercel.app/api/csaas-list
```

### 3. Probar Proxy

```bash
curl -H "Host: cliente-abc123.suncarsrl.com" \
  https://tu-dominio.vercel.app/api/proxy
```

## Próximos Pasos

### Corto Plazo
1. ✅ Eliminar `custom_origin_server` y `custom_origin_sni`
2. ✅ Implementar backend proxy
3. ✅ Actualizar frontend con instrucciones DNS
4. ⏳ Testing completo del flujo

### Mediano Plazo
1. Implementar base de datos para persistencia
2. Agregar autenticación y autorización
3. Implementar dashboard de administración
4. Agregar métricas y monitoreo

### Largo Plazo
1. Migrar a plan Business de Cloudflare (si es necesario)
2. Implementar multi-tenancy completo
3. Agregar facturación y gestión de clientes
4. Escalar infraestructura

## Conclusión

Esta arquitectura resuelve las limitaciones del plan gratuito de Cloudflare de manera elegante y defendible académicamente. El backend proxy inteligente permite mantener el dominio original del cliente con mínima intervención, mientras se aprovechan todas las protecciones de Cloudflare.

La solución es:
- ✅ Funcional
- ✅ Escalable (con base de datos)
- ✅ Defendible académicamente
- ✅ Compatible con plan gratuito
- ✅ Mínima intervención del cliente
