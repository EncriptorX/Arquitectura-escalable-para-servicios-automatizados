# Funcionamiento Real del Servicio de Protección Perimetral

## 📋 Resumen Ejecutivo

Este documento explica **exactamente** cómo funciona el servicio de protección perimetral de Cloudflare implementado en `api/solicitar-proteccion.py`.

---

## 🎯 ¿Qué hace el servicio?

El servicio **configura automáticamente** la protección perimetral de Cloudflare para dominios que el usuario ya tiene agregados en su cuenta de Cloudflare.

### ✅ Lo que SÍ hace:

1. **Resuelve la IP real** del servidor del usuario mediante DNS lookup
2. **Crea/actualiza registros DNS** en Cloudflare con la IP real
3. **Activa el proxy de Cloudflare** (nube naranja) para enrutar tráfico
4. **Configura SSL/TLS en modo Strict** para cifrado end-to-end
5. **Fuerza redirección HTTPS** para todo el tráfico
6. **Activa WAF** (Web Application Firewall) contra ataques OWASP
7. **Configura protección DDoS** en nivel alto
8. **Crea reglas de firewall personalizadas** para bloquear tráfico malicioso

### ❌ Lo que NO hace:

1. **NO agrega dominios nuevos a Cloudflare** - el dominio debe estar ya agregado
2. **NO cambia los nameservers automáticamente** - el usuario debe hacerlo manualmente
3. **NO puede proteger dominios de otras zonas** - solo la zona configurada

---

## 🔧 Requisitos Previos

### 1. Dominio ya agregado en Cloudflare

El usuario **DEBE** haber agregado su dominio a Cloudflare previamente:

```
1. Ir a Cloudflare Dashboard
2. Click en "Add a Site"
3. Ingresar el dominio (ej: midominio.com)
4. Seleccionar un plan (Free, Pro, Business, etc.)
5. Cloudflare asigna un Zone ID
```

### 2. Variables de entorno configuradas

En Vercel, configurar:

```bash
CF_API_TOKEN=tu_token_con_permisos
CF_ZONE_ID=el_zone_id_del_dominio
TURNSTILE_SECRET_KEY=tu_turnstile_key
```

**IMPORTANTE:** El `CF_ZONE_ID` corresponde a **UN SOLO DOMINIO**. Si el usuario tiene múltiples dominios en Cloudflare, necesita un Zone ID diferente para cada uno.

### 3. Permisos del API Token

El token debe tener estos permisos:

- **Zone:Read** - Para leer información de la zona
- **Zone Settings:Edit** - Para modificar SSL, WAF, etc.
- **DNS:Edit** - Para crear/actualizar registros DNS
- **Firewall Services:Edit** - Para crear reglas de firewall

---

## 🔄 Flujo de Ejecución Completo

### Paso 1: Usuario envía el formulario

```javascript
// Frontend envía:
{
  "urls": ["https://app.midominio.com"],
  "turnstileToken": "token_de_seguridad"
}
```

### Paso 2: Validación de seguridad

```python
# Línea 295-310
validate_turnstile(token, client_ip)
```

✅ Verifica que el usuario no es un bot usando Cloudflare Turnstile.

### Paso 3: Validación de URLs

```python
# Línea 320-330
for url in urls:
    if not validar_url(url):
        return error
```

✅ Verifica que las URLs tengan formato válido.

### Paso 4: Obtener información de la zona

```python
# Línea 345-355
zone_info = temp_protector.fetch_zone_info()
zone_name = zone_info["name"]  # ej: "midominio.com"
```

**Llamada API:**
```http
GET https://api.cloudflare.com/client/v4/zones/{zone_id}
Authorization: Bearer {token}
```

**Respuesta:**
```json
{
  "success": true,
  "result": {
    "name": "midominio.com",
    "name_servers": [
      "aron.ns.cloudflare.com",
      "june.ns.cloudflare.com"
    ]
  }
}
```

✅ Obtiene el nombre de la zona y los nameservers.

### Paso 5: Procesar cada URL

Para cada URL ingresada por el usuario:

#### 5.1 Extraer el dominio

```python
# Línea 365
dominio = url.replace("https://", "").replace("http://", "").split("/")[0]
# "https://app.midominio.com/path" → "app.midominio.com"
```

#### 5.2 Resolver IP real del dominio

```python
# Línea 368-370
origin_ip, error = obtener_ip_origen(dominio)
# Hace: socket.gethostbyname("app.midominio.com")
# Retorna: "192.0.2.1" (IP real del servidor del usuario)
```

**CRÍTICO:** Esta es la IP del servidor donde está alojado el sitio del usuario.

#### 5.3 Validar que el dominio pertenece a la zona

```python
# En run_provisioning(), línea 186-193
if not self.validate_domain_in_zone(dns_name, zone_name):
    return error
```

**Validación:**
- Si zona = `midominio.com`
- ✅ Válido: `midominio.com`, `app.midominio.com`, `api.midominio.com`
- ❌ Inválido: `otrodominio.com`, `ejemplo.com`

#### 5.4 Crear/actualizar registro DNS con proxy

```python
# configure_dns_proxy(), línea 77-103
```

**Llamada API 1: Buscar registro existente**
```http
GET https://api.cloudflare.com/client/v4/zones/{zone_id}/dns_records?name=app.midominio.com&type=A
Authorization: Bearer {token}
```

**Llamada API 2: Crear o actualizar**
```http
POST/PUT https://api.cloudflare.com/client/v4/zones/{zone_id}/dns_records
Authorization: Bearer {token}
Content-Type: application/json

{
  "type": "A",
  "name": "app.midominio.com",
  "content": "192.0.2.1",  ← IP REAL del servidor del usuario
  "proxied": true,         ← ACTIVA la protección perimetral
  "ttl": 1
}
```

**Resultado:** El tráfico a `app.midominio.com` ahora pasa por Cloudflare.

#### 5.5 Configurar SSL/TLS Strict

```python
# configure_ssl_strict(), línea 105-116
```

**Llamada API:**
```http
PATCH https://api.cloudflare.com/client/v4/zones/{zone_id}/settings/ssl
Authorization: Bearer {token}
Content-Type: application/json

{
  "value": "strict"
}
```

**Resultado:** Cifrado end-to-end activado.

#### 5.6 Forzar HTTPS

```python
# enable_https_force_redirect(), línea 118-127
```

**Llamada API:**
```http
PATCH https://api.cloudflare.com/client/v4/zones/{zone_id}/settings/always_use_https
Authorization: Bearer {token}
Content-Type: application/json

{
  "value": "on"
}
```

**Resultado:** HTTP → HTTPS automático.

#### 5.7 Activar WAF y DDoS

```python
# enable_security_features(), línea 129-145
```

**Llamada API 1: WAF**
```http
PATCH https://api.cloudflare.com/client/v4/zones/{zone_id}/settings/waf
Authorization: Bearer {token}
Content-Type: application/json

{
  "value": "on"
}
```

**Llamada API 2: Security Level**
```http
PATCH https://api.cloudflare.com/client/v4/zones/{zone_id}/settings/security_level
Authorization: Bearer {token}
Content-Type: application/json

{
  "value": "high"
}
```

**Resultado:** WAF y DDoS activados.

#### 5.8 Crear regla de firewall

```python
# create_firewall_custom_rule(), línea 147-177
```

**Llamada API:**
```http
POST https://api.cloudflare.com/client/v4/zones/{zone_id}/firewall/rules
Authorization: Bearer {token}
Content-Type: application/json

[
  {
    "filter": {
      "expression": "(ip.geoip.country eq \"XX\") or (http.user_agent contains \"BadBot\")",
      "paused": false
    },
    "action": "block",
    "description": "CAS Auto-Provisioned Block Rule"
  }
]
```

**Resultado:** Tráfico malicioso bloqueado.

### Paso 6: Retornar resultado

```python
# Línea 400-410
self._send_json({
    "status": "ok",
    "message": "Protección perimetral configurada exitosamente",
    "urls": urls,
    "sitios": protegidos,
    "logs": logs,
    "progress": 100,
    "nameservers": all_nameservers,
    "simulation_mode": False
}, 200)
```

---

## 🎯 Casos de Uso Reales

### Caso 1: Usuario con dominio en Cloudflare

**Escenario:**
- Usuario tiene `midominio.com` agregado en Cloudflare
- Zone ID: `abc123...`
- Servidor en IP: `192.0.2.1`

**Proceso:**
1. Usuario configura `CF_ZONE_ID=abc123...` en Vercel
2. Usuario ingresa `https://midominio.com` en el formulario
3. Script resuelve `midominio.com` → `192.0.2.1`
4. Script crea registro DNS: `midominio.com` → `192.0.2.1` (proxied)
5. Script configura SSL, WAF, DDoS, Firewall
6. ✅ **Protección aplicada exitosamente**

### Caso 2: Usuario con subdominio

**Escenario:**
- Usuario tiene `midominio.com` en Cloudflare
- Quiere proteger `app.midominio.com`
- Servidor en IP: `192.0.2.2`

**Proceso:**
1. Usuario configura `CF_ZONE_ID` de `midominio.com`
2. Usuario ingresa `https://app.midominio.com`
3. Script valida que `app.midominio.com` pertenece a la zona
4. Script resuelve `app.midominio.com` → `192.0.2.2`
5. Script crea registro DNS para el subdominio
6. ✅ **Protección aplicada exitosamente**

### Caso 3: Usuario intenta proteger dominio de otra zona

**Escenario:**
- Usuario tiene `midominio.com` en Cloudflare (Zone ID: `abc123`)
- Intenta proteger `otrodominio.com`

**Proceso:**
1. Usuario configura `CF_ZONE_ID=abc123` (de midominio.com)
2. Usuario ingresa `https://otrodominio.com`
3. Script valida que `otrodominio.com` NO pertenece a `midominio.com`
4. ❌ **Error: "Dominio no válido para esta zona"**

**Solución:** Usuario debe agregar `otrodominio.com` a Cloudflare y usar su Zone ID.

---

## ⚠️ Limitaciones Importantes

### 1. Un Zone ID = Un Dominio

El servicio solo puede proteger **un dominio y sus subdominios** por configuración.

**Ejemplo:**
- `CF_ZONE_ID` de `midominio.com` puede proteger:
  - ✅ `midominio.com`
  - ✅ `app.midominio.com`
  - ✅ `api.midominio.com`
  - ❌ `otrodominio.com` (necesita otro Zone ID)

### 2. Dominio debe existir en Cloudflare

El servicio **NO agrega dominios nuevos** a Cloudflare. El usuario debe:
1. Ir a Cloudflare Dashboard
2. Agregar el dominio manualmente
3. Obtener el Zone ID
4. Configurarlo en Vercel

### 3. Nameservers deben estar delegados

Para que la protección funcione **completamente**, el usuario debe:
1. Ir a su registrador de dominios (GoDaddy, Namecheap, etc.)
2. Cambiar los nameservers a los de Cloudflare
3. Esperar propagación DNS (puede tardar horas)

**Mientras tanto:**
- Las configuraciones de seguridad (SSL, WAF, etc.) están activas
- Pero el tráfico no pasa por Cloudflare hasta que los NS estén delegados

### 4. Limitaciones por plan de Cloudflare

Algunas funciones requieren planes superiores:

| Función | Free | Pro | Business |
|---------|------|-----|----------|
| DNS Proxy | ✅ | ✅ | ✅ |
| SSL/TLS | ✅ | ✅ | ✅ |
| WAF Básico | ✅ | ✅ | ✅ |
| DDoS Protection | ✅ | ✅ | ✅ |
| Firewall Rules | 5 reglas | 20 reglas | 100 reglas |
| WAF Avanzado | ❌ | ❌ | ✅ |

---

## ✅ Verificación de Funcionamiento

### Método 1: Usar el script de prueba

```bash
python test_real_protection.py
```

Este script muestra:
- Registros DNS actuales
- Configuraciones de seguridad
- Reglas de firewall
- Estado de la zona

### Método 2: Verificar en Cloudflare Dashboard

1. **DNS Records:**
   - Ir a DNS → Records
   - Buscar el dominio
   - Verificar que tenga 🟠 (nube naranja)

2. **SSL/TLS:**
   - Ir a SSL/TLS → Overview
   - Verificar: "Full (strict)"

3. **Security:**
   - Ir a Security → Settings
   - Verificar: Security Level = High
   - Verificar: WAF = On

4. **Firewall:**
   - Ir a Security → WAF
   - Verificar regla "CAS Auto-Provisioned Block Rule"

### Método 3: Verificar con curl

```bash
# Verificar que el tráfico pasa por Cloudflare
curl -I https://midominio.com

# Debe incluir headers:
# cf-ray: ...
# cf-cache-status: ...
# server: cloudflare
```

---

## 🎯 Conclusión

El servicio **SÍ implementa protección perimetral REAL** de Cloudflare, pero con estas condiciones:

✅ **Funciona cuando:**
- El dominio ya está agregado en Cloudflare
- El Zone ID está configurado correctamente
- El dominio pertenece a la zona configurada
- Las credenciales tienen los permisos necesarios

❌ **NO funciona cuando:**
- El dominio no está en Cloudflare
- Se intenta proteger un dominio de otra zona
- Las credenciales no tienen permisos
- El dominio no se puede resolver (DNS)

**El servicio es 100% funcional dentro de sus limitaciones diseñadas.**
