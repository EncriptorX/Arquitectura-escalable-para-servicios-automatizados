# 🔍 Guía de Diagnóstico: Subdominios No Funcionan

## 📋 Información Necesaria

Para diagnosticar el problema, necesito que me proporciones:

### 1. ¿Qué dominio ingresaste en el formulario?
Ejemplo: `example.com`, `www.google.com`, `app.micliente.com`

**Tu respuesta**: _______________

### 2. ¿Cuál es el subdominio que se generó?
Ejemplo: `testclient-abc123.cubansaas.tech`

**Tu respuesta**: _______________

### 3. ¿Qué ves cuando accedes al subdominio?
- [ ] Página en blanco
- [ ] Error 404 de Vercel
- [ ] Error 525 de Cloudflare (SSL Handshake Failed)
- [ ] Error 522 de Cloudflare (Connection Timed Out)
- [ ] Error 523 de Cloudflare (Origin Unreachable)
- [ ] Timeout (no carga nada)
- [ ] Otro: _______________

### 4. ¿El dominio del cliente funciona directamente?
Prueba acceder directamente al dominio que ingresaste:
```bash
curl -I https://dominio-que-ingresaste.com
```

**¿Funciona?**: [ ] Sí [ ] No

**Código de respuesta**: _______________

---

## 🧪 Diagnóstico Automático

### Paso 1: Ejecutar Script de Diagnóstico

```bash
# Asegúrate de tener las variables de entorno configuradas
# CF_API_TOKEN y CF_ZONE_ID en tu archivo .env

python scripts/diagnosticar_subdominio.py <tu-subdominio>.cubansaas.tech
```

**Ejemplo**:
```bash
python scripts/diagnosticar_subdominio.py testclient-abc123.cubansaas.tech
```

El script verificará:
- ✅ Si el registro DNS existe en Cloudflare
- ✅ A qué dominio apunta el CNAME
- ✅ Si el proxy está activado
- ✅ Si el dominio de destino es accesible

---

## 🔍 Diagnóstico Manual

### Paso 1: Verificar Registro DNS en Cloudflare

#### Opción A: Dashboard de Cloudflare
1. Ir a https://dash.cloudflare.com
2. Seleccionar `cubansaas.tech`
3. Ir a **DNS** → **Records**
4. Buscar tu subdominio (ej: `testclient-abc123`)

**Verificar**:
- ✅ Tipo: CNAME
- ✅ Nombre: tu-subdominio
- ✅ Target/Content: **dominio-del-cliente.com** (NO `customers.cubansaas.tech`)
- ✅ Proxy status: Proxied (nube naranja) ☁️

#### Opción B: API de Cloudflare
```bash
curl -X GET "https://api.cloudflare.com/client/v4/zones/{ZONE_ID}/dns_records?name=tu-subdominio.cubansaas.tech" \
  -H "Authorization: Bearer {API_TOKEN}" \
  | jq '.result[0]'
```

**Esperado**:
```json
{
  "type": "CNAME",
  "name": "testclient-abc123.cubansaas.tech",
  "content": "dominio-del-cliente.com",  ← Debe ser el dominio del cliente
  "proxied": true,  ← Debe ser true
  "ttl": 1
}
```

---

### Paso 2: Verificar Resolución DNS

```bash
# Windows
nslookup tu-subdominio.cubansaas.tech

# Linux/Mac
dig tu-subdominio.cubansaas.tech
```

**Esperado**: Debe mostrar IPs de Cloudflare
- `104.x.x.x`
- `172.x.x.x`
- `2606:4700::/32` (IPv6)

**Si muestra otras IPs**: El DNS no se ha propagado o el proxy no está activado.

---

### Paso 3: Verificar Conectividad

```bash
# Probar HTTP
curl -I http://tu-subdominio.cubansaas.tech

# Probar HTTPS
curl -I https://tu-subdominio.cubansaas.tech

# Ver headers completos
curl -v https://tu-subdominio.cubansaas.tech
```

**Buscar en la respuesta**:
- ✅ `server: cloudflare` → Cloudflare está activo
- ✅ `cf-ray: ...` → Request pasó por Cloudflare
- ✅ Código de estado (200, 301, 404, etc.)

---

### Paso 4: Verificar Dominio de Origen

```bash
# Verificar que el dominio del cliente funciona
curl -I https://dominio-del-cliente.com
```

**Esperado**: Código 200 OK o 301/302 (redirección)

**Si falla**: El problema está en el dominio del cliente, no en tu configuración.

---

## 🚨 Problemas Comunes y Soluciones

### Problema 1: CNAME Apunta a `customers.cubansaas.tech`

**Síntoma**: Error 404 de Vercel

**Causa**: El CNAME está mal configurado

**Solución**:
1. Ir a Cloudflare Dashboard → DNS
2. Editar el registro CNAME
3. Cambiar "Target" de `customers.cubansaas.tech` a `dominio-del-cliente.com`
4. Guardar

---

### Problema 2: Proxy No Activado

**Síntoma**: Se ve la IP del origen en lugar del contenido

**Causa**: El proxy de Cloudflare no está activado

**Solución**:
1. Ir a Cloudflare Dashboard → DNS
2. Hacer clic en la nube gris del registro
3. Cambiar a nube naranja (Proxied)
4. Guardar

---

### Problema 3: Dominio del Cliente No Existe

**Síntoma**: Error 522 o 523 de Cloudflare

**Causa**: El dominio del cliente no es accesible

**Solución**:
1. Verificar que el dominio del cliente existe y funciona
2. Probar acceder directamente: `curl -I https://dominio-cliente.com`
3. Si no funciona, el problema está en el dominio del cliente

---

### Problema 4: Error SSL (525)

**Síntoma**: Error 525 SSL Handshake Failed

**Causa**: Configuración SSL incorrecta

**Solución**:
1. Ir a Cloudflare Dashboard → SSL/TLS
2. Cambiar modo SSL:
   - Si el origen NO tiene SSL: **Flexible**
   - Si el origen SÍ tiene SSL: **Full**
3. Esperar 5 minutos
4. Probar de nuevo

---

### Problema 5: DNS No Propagado

**Síntoma**: "No se puede acceder al sitio" o timeout

**Causa**: El DNS aún no se ha propagado

**Solución**:
1. Esperar 5-15 minutos
2. Verificar propagación: https://dnschecker.org
3. Probar de nuevo

---

## 📊 Tabla de Diagnóstico Rápido

| Síntoma | Causa Probable | Solución |
|---------|----------------|----------|
| 404 de Vercel | CNAME apunta a `customers.cubansaas.tech` | Cambiar CNAME a dominio del cliente |
| 525 SSL Error | Modo SSL incorrecto | Cambiar a "Flexible" o "Full" |
| 522 Timeout | Dominio origen no responde | Verificar dominio del cliente |
| 523 Unreachable | Dominio origen no existe | Verificar dominio del cliente |
| Timeout | DNS no propagado | Esperar 5-15 minutos |
| IP visible | Proxy desactivado | Activar proxy (nube naranja) |

---

## 🎯 Checklist de Verificación

Marca cada item cuando lo hayas verificado:

- [ ] El registro DNS existe en Cloudflare
- [ ] El tipo de registro es CNAME
- [ ] El CNAME apunta al dominio del cliente (NO a `customers.cubansaas.tech`)
- [ ] El proxy está activado (nube naranja)
- [ ] El DNS se ha propagado (5-15 minutos)
- [ ] El dominio del cliente es accesible directamente
- [ ] El modo SSL está configurado correctamente
- [ ] No hay errores en los logs de Cloudflare

---

## 📞 Información para Soporte

Si después de seguir esta guía el problema persiste, proporciona:

1. **Subdominio generado**: _______________
2. **Dominio del cliente**: _______________
3. **Resultado del script de diagnóstico**: (pegar output completo)
4. **Resultado de `curl -v https://tu-subdominio.cubansaas.tech`**: (pegar output)
5. **Captura de pantalla del registro DNS en Cloudflare Dashboard**
6. **Logs del formulario** (si hay errores en la consola del navegador)

---

## 🔧 Comandos Útiles

### Ver todos los subdominios creados
```bash
curl -X GET "https://api.cloudflare.com/client/v4/zones/{ZONE_ID}/dns_records?type=CNAME" \
  -H "Authorization: Bearer {API_TOKEN}" \
  | jq '.result[] | select(.name | contains("cubansaas.tech")) | {name, content, proxied}'
```

### Eliminar un subdominio
```bash
curl -X DELETE "https://api.cloudflare.com/client/v4/zones/{ZONE_ID}/dns_records/{RECORD_ID}" \
  -H "Authorization: Bearer {API_TOKEN}"
```

### Ver configuración SSL
```bash
curl -X GET "https://api.cloudflare.com/client/v4/zones/{ZONE_ID}/settings/ssl" \
  -H "Authorization: Bearer {API_TOKEN}" \
  | jq '.result'
```

---

**Última Actualización**: 30 de Enero de 2026  
**Estado**: Guía de Diagnóstico Completa
