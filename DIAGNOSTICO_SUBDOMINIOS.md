# 🔍 Diagnóstico: Subdominios No Funcionan

## 📋 Síntoma

Los subdominios se generan y agregan correctamente a Cloudflare, pero al acceder a ellos no ocurre nada.

---

## 🎯 Arquitectura Actual

### Flujo Esperado

```
Usuario → cliente-abc.cubansaas.tech → Cloudflare (Proxy) → dominio-real-cliente.com
```

### Configuración DNS

```
Tipo: CNAME
Nombre: cliente-abc.cubansaas.tech
Destino: dominio-real-cliente.com
Proxy: Activado (naranja)
```

---

## 🔍 Posibles Causas

### 1. Propagación DNS Pendiente

**Síntoma:** Timeout o "No se puede acceder al sitio"

**Causa:** El DNS aún no se ha propagado

**Solución:** Esperar 5-15 minutos

**Verificar:**
```bash
# Verificar DNS
nslookup cliente-abc.cubansaas.tech

# Debería mostrar IPs de Cloudflare (104.x.x.x o 172.x.x.x)
```

---

### 2. Dominio de Origen No Resuelve

**Síntoma:** Error 522 o 523 de Cloudflare

**Causa:** El dominio del cliente no existe o no es accesible

**Solución:** Verificar que el dominio del cliente sea válido

**Verificar:**
```bash
# Verificar que el dominio del cliente existe
curl -I https://dominio-real-cliente.com

# Debería retornar 200 OK
```

---

### 3. Error de SSL/TLS

**Síntoma:** Error SSL o "Conexión no segura"

**Causa:** Configuración SSL incorrecta en Cloudflare

**Solución:** Configurar SSL en modo "Flexible" o "Full"

**Verificar en Cloudflare:**
1. Dashboard → cubansaas.tech → SSL/TLS
2. Modo SSL: Debe ser "Flexible" o "Full"
3. Si el origen no tiene SSL: Usar "Flexible"
4. Si el origen tiene SSL: Usar "Full"

---

### 4. CNAME Apunta a Dominio Incorrecto

**Síntoma:** Página del dominio incorrecto o 404

**Causa:** El CNAME está mal configurado

**Solución:** Verificar el registro DNS en Cloudflare

**Verificar:**
```bash
# Ver registros DNS
curl -X GET "https://api.cloudflare.com/client/v4/zones/{zone_id}/dns_records?name=cliente-abc.cubansaas.tech" \
  -H "Authorization: Bearer {api_token}"

# Verificar que "content" apunte al dominio correcto
```

---

### 5. Proxy No Activado

**Síntoma:** Se ve la IP del origen en lugar del contenido

**Causa:** El proxy de Cloudflare no está activado

**Solución:** Activar el proxy (nube naranja)

**Verificar:**
```bash
# El registro debe tener "proxied": true
```

---

## 🧪 Diagnóstico Paso a Paso

### Paso 1: Verificar que el Subdominio Existe en Cloudflare

```bash
# Listar todos los registros DNS
curl -X GET "https://api.cloudflare.com/client/v4/zones/{zone_id}/dns_records" \
  -H "Authorization: Bearer {api_token}" \
  | jq '.result[] | select(.name | contains("cliente"))'
```

**Esperado:**
```json
{
  "type": "CNAME",
  "name": "cliente-abc.cubansaas.tech",
  "content": "dominio-cliente.com",
  "proxied": true
}
```

---

### Paso 2: Verificar Resolución DNS

```bash
# Windows
nslookup cliente-abc.cubansaas.tech

# Linux/Mac
dig cliente-abc.cubansaas.tech

# Debería retornar IPs de Cloudflare
```

**IPs de Cloudflare esperadas:**
- 104.x.x.x
- 172.x.x.x
- 2606:4700::/32 (IPv6)

---

### Paso 3: Verificar Conectividad

```bash
# Probar conexión HTTP
curl -I http://cliente-abc.cubansaas.tech

# Probar conexión HTTPS
curl -I https://cliente-abc.cubansaas.tech

# Ver headers completos
curl -v https://cliente-abc.cubansaas.tech
```

**Buscar en la respuesta:**
- `server: cloudflare` ✅
- `cf-ray: ...` ✅
- Código de estado (200, 301, 404, etc.)

---

### Paso 4: Verificar Dominio de Origen

```bash
# Verificar que el dominio del cliente funciona
curl -I https://dominio-real-cliente.com

# Debería retornar 200 OK o 301/302
```

---

## 🔧 Soluciones Según el Error

### Error: "No se puede acceder al sitio"

**Causa:** DNS no propagado o dominio no existe

**Solución:**
1. Esperar 5-15 minutos para propagación DNS
2. Verificar que el registro DNS existe en Cloudflare
3. Verificar que el dominio de origen es válido

---

### Error: 522 (Connection Timed Out)

**Causa:** Cloudflare no puede conectar con el origen

**Solución:**
1. Verificar que el dominio de origen está online
2. Verificar que el dominio de origen acepta conexiones
3. Verificar firewall del origen

---

### Error: 523 (Origin Is Unreachable)

**Causa:** El origen no responde

**Solución:**
1. Verificar que el dominio de origen existe
2. Verificar que el CNAME apunta al dominio correcto
3. Probar acceder directamente al origen

---

### Error: 525 (SSL Handshake Failed)

**Causa:** Error de SSL entre Cloudflare y el origen

**Solución:**
1. Cambiar modo SSL a "Flexible" en Cloudflare
2. O asegurarse de que el origen tiene SSL válido

---

### Error: 1014 (CNAME Cross-User Banned)

**Causa:** El CNAME apunta a otro dominio en Cloudflare

**Solución:**
1. El dominio de origen no debe estar en Cloudflare
2. O usar un registro A en lugar de CNAME

---

## 📝 Checklist de Verificación

- [ ] Subdominio existe en Cloudflare DNS
- [ ] Registro es tipo CNAME
- [ ] Proxy está activado (naranja)
- [ ] CNAME apunta al dominio correcto del cliente
- [ ] DNS se ha propagado (5-15 minutos)
- [ ] Dominio de origen es accesible
- [ ] Modo SSL configurado correctamente
- [ ] No hay errores en logs de Cloudflare

---

## 🛠️ Herramientas de Diagnóstico

### 1. Cloudflare Dashboard

```
https://dash.cloudflare.com → cubansaas.tech → DNS
```

Verificar:
- ✅ Registro CNAME existe
- ✅ Proxy activado (nube naranja)
- ✅ Destino correcto

### 2. Cloudflare Analytics

```
https://dash.cloudflare.com → cubansaas.tech → Analytics
```

Ver:
- Requests al subdominio
- Errores (4xx, 5xx)
- Códigos de estado

### 3. DNS Checker

```
https://dnschecker.org
```

Verificar propagación DNS global

### 4. SSL Checker

```
https://www.ssllabs.com/ssltest/
```

Verificar configuración SSL

---

## 🎯 Solución Recomendada

### Si el Dominio del Cliente NO tiene SSL

```
1. Cloudflare Dashboard → SSL/TLS
2. Modo: Flexible
3. Esperar 5 minutos
4. Probar subdominio
```

### Si el Dominio del Cliente SÍ tiene SSL

```
1. Cloudflare Dashboard → SSL/TLS
2. Modo: Full
3. Esperar 5 minutos
4. Probar subdominio
```

---

## 📞 Información Necesaria para Diagnóstico

Para ayudarte mejor, necesito saber:

1. **¿Qué ves cuando accedes al subdominio?**
   - [ ] Página en blanco
   - [ ] Error 404
   - [ ] Error 522/523
   - [ ] Error SSL
   - [ ] Timeout
   - [ ] Otro: ___________

2. **¿Cuál es el subdominio generado?**
   - Ejemplo: `cliente-abc123.cubansaas.tech`

3. **¿Cuál es el dominio de origen del cliente?**
   - Ejemplo: `www.cliente.com`

4. **¿El dominio de origen funciona directamente?**
   - Prueba: `curl -I https://dominio-origen.com`

5. **¿Cuánto tiempo ha pasado desde que se creó?**
   - [ ] Menos de 5 minutos
   - [ ] 5-15 minutos
   - [ ] Más de 15 minutos

---

## 🚀 Próximos Pasos

1. **Comparte la información solicitada arriba**
2. **Ejecuta los comandos de diagnóstico**
3. **Comparte los resultados**
4. **Te ayudaré a resolver el problema específico**

---

**Última Actualización:** 29 de Enero de 2026  
**Estado:** Diagnóstico en Proceso
