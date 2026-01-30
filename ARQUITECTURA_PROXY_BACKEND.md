# 🏗️ Arquitectura CSaaS con Proxy Backend

## 📊 Cambios Realizados

### ✅ Archivos Fusionados
- ❌ Eliminado: `api/csaas-simple-provision.py` (duplicado)
- ✅ Actualizado: `api/csaas-provision.py` (único archivo, fusionado)
- ✅ Actualizado: `api/proxy.py` (mejorado para sincronización)
- ✅ Actualizado: `vercel.json` (catch-all route para subdominios)

### 🎯 Arquitectura Implementada

```
┌─────────────────────────────────────────────────────────────┐
│                    FLUJO COMPLETO                            │
└─────────────────────────────────────────────────────────────┘

1. Usuario accede a: https://cliente-abc.cubansaas.tech
                              ↓
2. DNS resuelve (Cloudflare): CNAME → customers.cubansaas.tech
                              ↓
3. Cloudflare Proxy (naranja): Protección perimetral activa
                              ↓
4. Vercel recibe request en: customers.cubansaas.tech
                              ↓
5. vercel.json enruta a: /api/proxy.py
                              ↓
6. proxy.py identifica: cliente-abc.cubansaas.tech
                              ↓
7. proxy.py busca mapeo: cliente-abc → dominio-real-cliente.com
                              ↓
8. proxy.py hace fetch: https://dominio-real-cliente.com
                              ↓
9. proxy.py devuelve: Contenido del cliente al usuario
                              ↓
10. ✅ Usuario ve el contenido protegido
```

---

## 🔧 Componentes del Sistema

### 1. `api/csaas-provision.py` (Provisionamiento)

**Función**: Crear subdominios y configurar el proxy automáticamente

**Pasos**:
1. Genera subdominio único: `cliente-abc123.cubansaas.tech`
2. Crea CNAME en Cloudflare: `cliente-abc123 → customers.cubansaas.tech`
3. Activa proxy de Cloudflare (nube naranja)
4. Aplica reglas de seguridad (WAF, SSL, Bot Fight, etc.)
5. **Registra mapeo en memoria**: `cliente-abc123.cubansaas.tech → dominio-cliente.com`
6. Devuelve URL protegida al usuario

**Código clave**:
```python
def configure_proxy_mapping(self, subdomain: str, origin_url: str):
    from proxy import ProxyConfig
    ProxyConfig.SUBDOMAIN_MAP[subdomain] = origin_url
```

---

### 2. `api/proxy.py` (Proxy Reverso)

**Función**: Interceptar requests a subdominios y hacer fetch al dominio real

**Pasos**:
1. Recibe request con Host: `cliente-abc123.cubansaas.tech`
2. Extrae el subdominio
3. Busca el dominio real en el mapa: `SUBDOMAIN_MAP[subdomain]`
4. Si no está en el mapa, busca en `CSaaSConfig.PROVISIONED_CLIENTS`
5. Hace fetch al dominio real: `https://dominio-cliente.com`
6. Devuelve la respuesta al usuario

**Código clave**:
```python
def get_origin_for_subdomain(subdomain: str):
    # 1. Buscar en mapa en memoria
    origin = ProxyConfig.SUBDOMAIN_MAP.get(subdomain)
    if origin:
        return origin
    
    # 2. Buscar en PROVISIONED_CLIENTS
    from config import CSaaSConfig
    for client_info in CSaaSConfig.PROVISIONED_CLIENTS.values():
        if client_info['subdomain'] == subdomain:
            return client_info['origin_urls'][0]
```

---

### 3. `vercel.json` (Enrutamiento)

**Función**: Enrutar todas las requests de subdominios al proxy

**Configuración clave**:
```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/api/proxy.py"
    }
  ]
}
```

**Importante**: Esta regla debe estar **al final** para que sea un catch-all.

---

## 🔄 Flujo de Datos

### Provisionamiento (Una vez)

```
Usuario llena formulario
    ↓
POST /api/csaas-provision
    ↓
CloudflareClient.provision_client()
    ├─ create_cname_to_proxy()
    │   └─ Crea CNAME: subdominio → customers.cubansaas.tech
    ├─ apply_security_rules()
    │   └─ Activa WAF, SSL, Bot Fight, etc.
    └─ configure_proxy_mapping()
        └─ ProxyConfig.SUBDOMAIN_MAP[subdominio] = dominio_cliente
    ↓
Devuelve URL protegida
```

### Acceso al Subdominio (Cada request)

```
Usuario accede a: https://cliente-abc.cubansaas.tech
    ↓
DNS resuelve: CNAME → customers.cubansaas.tech
    ↓
Cloudflare Proxy: Protección activa
    ↓
Vercel recibe: Host: cliente-abc.cubansaas.tech
    ↓
vercel.json enruta: /(.*) → /api/proxy.py
    ↓
proxy.py:
    ├─ extract_subdomain(Host)
    ├─ get_origin_for_subdomain(subdomain)
    │   └─ Busca en SUBDOMAIN_MAP o PROVISIONED_CLIENTS
    ├─ forward_request(origin_url)
    │   └─ fetch https://dominio-cliente.com
    └─ Devuelve respuesta
    ↓
Usuario ve contenido protegido
```

---

## 🎯 Ventajas de Esta Arquitectura

### ✅ Completamente Automático
- No requiere intervención manual en Cloudflare
- El CNAME se crea automáticamente
- El mapeo del proxy se configura automáticamente

### ✅ Compatible con Plan Gratuito
- No usa Custom Hostnames (requiere Business+)
- No usa custom_origin_server (no disponible en Free)
- Solo usa CNAME + Proxy de Cloudflare

### ✅ Control Total
- Puedes modificar el contenido en tránsito
- Puedes agregar headers personalizados
- Puedes implementar lógica personalizada

### ✅ Protección Perimetral Real
- Cloudflare protege el tráfico (WAF, DDoS, Bot Fight)
- SSL/TLS automático
- Rate limiting y security rules

---

## 🔍 Verificación

### 1. Verificar que el CNAME se creó correctamente

```bash
# En Cloudflare Dashboard
# DNS → Records → Buscar tu subdominio

# Debe mostrar:
# Tipo: CNAME
# Nombre: cliente-abc123
# Target: customers.cubansaas.tech
# Proxy: Activado (naranja)
```

### 2. Verificar que el mapeo del proxy está configurado

```bash
# Hacer GET al endpoint de provision
curl https://cubansaas.tech/api/csaas-provision

# Debe mostrar:
{
  "proxy_map": {
    "cliente-abc123.cubansaas.tech": "dominio-cliente.com"
  }
}
```

### 3. Verificar que el proxy funciona

```bash
# Acceder al subdominio
curl -v https://cliente-abc123.cubansaas.tech

# Debe mostrar:
# - server: cloudflare (protección activa)
# - cf-ray: ... (pasó por Cloudflare)
# - Contenido del dominio del cliente
```

---

## 🚨 Troubleshooting

### Problema: 404 de Vercel

**Causa**: El catch-all route no está funcionando

**Solución**:
1. Verificar que `vercel.json` tiene el catch-all al final
2. Redesplegar en Vercel
3. Esperar 1-2 minutos para propagación

### Problema: "Origin Not Found"

**Causa**: El mapeo del proxy no está configurado

**Solución**:
1. Verificar que el subdominio existe en `PROVISIONED_CLIENTS`
2. Verificar que `proxy.py` puede importar `CSaaSConfig`
3. Recrear el subdominio con el formulario

### Problema: Error 502 Bad Gateway

**Causa**: El dominio del cliente no es accesible

**Solución**:
1. Verificar que el dominio del cliente funciona: `curl -I https://dominio-cliente.com`
2. Verificar que el dominio no requiere autenticación
3. Verificar que el dominio acepta requests de Vercel

---

## 📝 Configuración Requerida

### Variables de Entorno (.env)

```bash
# Cloudflare API
CF_API_TOKEN=tu_token_aqui
CF_ZONE_ID=tu_zone_id_aqui

# CSaaS Configuration
CSAAS_ZONE=cubansaas.tech
CSAAS_CNAME_TARGET=customers.cubansaas.tech

# Hosts Permitidos
ALLOWED_HOSTS=cubansaas.tech,*.cubansaas.tech,localhost,127.0.0.1,*.vercel.app
```

### DNS en Cloudflare

```
# Registro A o CNAME para customers.cubansaas.tech
Tipo: CNAME
Nombre: customers
Target: cname.vercel-dns.com
Proxy: Desactivado (gris)

# Los subdominios se crean automáticamente
Tipo: CNAME
Nombre: cliente-abc123
Target: customers.cubansaas.tech
Proxy: Activado (naranja)
```

---

## 🎉 Resultado Final

Con esta arquitectura:

1. ✅ El usuario llena el formulario una vez
2. ✅ El sistema crea el subdominio automáticamente
3. ✅ El CNAME apunta a `customers.cubansaas.tech` automáticamente
4. ✅ El proxy se configura automáticamente
5. ✅ El tráfico está protegido por Cloudflare
6. ✅ El contenido del cliente se sirve a través del proxy
7. ✅ Todo es completamente automático

**No se requiere intervención manual en ningún paso.**

---

**Última Actualización**: 30 de Enero de 2026  
**Estado**: Arquitectura Implementada y Documentada
