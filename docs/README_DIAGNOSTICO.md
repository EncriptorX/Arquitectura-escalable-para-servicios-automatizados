# 🔍 Diagnóstico del Servicio de Protección Perimetral

## ⚠️ IMPORTANTE: ¿Por qué el proceso se ve igual?

Si el proceso se ve **exactamente igual** a como era antes, es porque el servicio está corriendo en **MODO SIMULACIÓN**.

### Esto sucede cuando:
- ❌ `CF_API_TOKEN` NO está configurado en Vercel
- ❌ `CF_ZONE_ID` NO está configurado en Vercel

### En modo simulación:
- ✅ El formulario funciona
- ✅ Turnstile valida
- ✅ Se muestran logs
- ❌ **NO se aplica protección real**
- ❌ **NO se hacen llamadas a Cloudflare API**
- ❌ **NO se crean registros DNS**
- ❌ **NO se configura SSL, WAF, DDoS**

---

## 🛠️ Cómo Verificar el Modo Actual

### Opción 1: Página de Diagnóstico (Recomendado)

1. Abre en tu navegador: `https://tu-dominio.vercel.app/diagnostico.html`
2. Verás claramente:
   - ✅ **MODO REAL** = Protección activa
   - ⚠️ **MODO SIMULACIÓN** = Solo prueba, sin protección

### Opción 2: Endpoint de Diagnóstico

```bash
curl https://tu-dominio.vercel.app/api/diagnostico
```

Respuesta en modo simulación:
```json
{
  "modo_actual": "SIMULACIÓN",
  "estado": {
    "puede_aplicar_proteccion_real": false,
    "modo_simulacion_activo": true
  }
}
```

Respuesta en modo real:
```json
{
  "modo_actual": "REAL",
  "estado": {
    "puede_aplicar_proteccion_real": true,
    "modo_simulacion_activo": false
  }
}
```

### Opción 3: Revisar los Logs del Formulario

**Modo Simulación:**
```
WARNING: Cloudflare credentials not configured - running in simulation mode
Simulation completed - No real changes made to Cloudflare
```

**Modo Real:**
```
Starting REAL Cloudflare protection configuration...
Using Cloudflare Zone ID: abc12345...
✓ Zona: midominio.com
✓ Registro DNS creado exitosamente con Proxy activado
✓ Modo SSL configurado a Full (Strict)
```

---

## 🔧 Cómo Activar el Modo Real

### Paso 1: Obtener Credenciales de Cloudflare

#### A. Obtener CF_API_TOKEN

1. Ve a: https://dash.cloudflare.com/profile/api-tokens
2. Click en **"Create Token"**
3. Selecciona plantilla **"Edit zone DNS"** o crea uno custom
4. Permisos necesarios:
   - ✅ Zone:Read
   - ✅ Zone Settings:Edit
   - ✅ DNS:Edit
   - ✅ Firewall Services:Edit
5. Click en **"Continue to summary"**
6. Click en **"Create Token"**
7. **COPIA EL TOKEN** (solo se muestra una vez)

#### B. Obtener CF_ZONE_ID

1. Ve a: https://dash.cloudflare.com
2. Selecciona tu dominio
3. En la barra lateral derecha, busca **"Zone ID"**
4. **COPIA EL ZONE ID**

### Paso 2: Configurar en Vercel

1. Ve a: https://vercel.com/dashboard
2. Selecciona tu proyecto **"cuban-cas"**
3. Ve a **Settings** → **Environment Variables**
4. Agrega las siguientes variables:

```
Nombre: CF_API_TOKEN
Valor: [pega tu token aquí]

Nombre: CF_ZONE_ID
Valor: [pega tu zone id aquí]
```

5. Click en **"Save"**

### Paso 3: Redeploy (CRÍTICO)

**IMPORTANTE:** Las variables de entorno solo se aplican en nuevos deploys.

1. Ve a **Deployments**
2. Click en los **tres puntos** del último deployment
3. Click en **"Redeploy"**
4. Espera a que termine el deploy

### Paso 4: Verificar

1. Abre: `https://tu-dominio.vercel.app/diagnostico.html`
2. Debes ver: **✅ MODO REAL**
3. Todas las variables deben mostrar: **Configurado**

---

## 📊 Comparación: Simulación vs Real

| Característica | Modo Simulación | Modo Real |
|----------------|-----------------|-----------|
| Valida formulario | ✅ | ✅ |
| Valida Turnstile | ✅ | ✅ |
| Muestra logs | ✅ | ✅ |
| Llama a Cloudflare API | ❌ | ✅ |
| Obtiene info de zona | ❌ | ✅ |
| Resuelve IP del dominio | ❌ | ✅ |
| Crea registros DNS | ❌ | ✅ |
| Activa proxy (nube naranja) | ❌ | ✅ |
| Configura SSL/TLS | ❌ | ✅ |
| Activa Force HTTPS | ❌ | ✅ |
| Activa WAF | ❌ | ✅ |
| Configura DDoS Protection | ❌ | ✅ |
| Crea reglas de firewall | ❌ | ✅ |
| **Protege el dominio** | ❌ | ✅ |

---

## 🎯 Cómo Saber si Funcionó

### 1. Revisar Logs en el Frontend

Después de enviar el formulario, busca estas líneas:

✅ **Funcionó (Modo Real):**
```
Starting REAL Cloudflare protection configuration...
Using Cloudflare Zone ID: abc12345...
Obteniendo información de la zona de Cloudflare...
✓ Zona: midominio.com
✓ Nameservers: aron.ns.cloudflare.com, june.ns.cloudflare.com
[1/1] Processing domain: midominio.com
Resolving IP address for midominio.com...
✓ Resolved midominio.com -> 192.0.2.1
=== INICIANDO PROVISIÓN DE SEGURIDAD PERIMETRAL ===
✓ Dominio 'midominio.com' validado para la zona 'midominio.com'
Configurando DNS para midominio.com -> 192.0.2.1 (A)...
✓ Registro DNS creado exitosamente con Proxy activado
Configurando modo SSL a Full (Strict)...
✓ Modo SSL configurado a Full (Strict)
Activando 'Always Use HTTPS'...
✓ Redirección HTTPS forzada activada
Optimizando configuraciones de Seguridad y DDoS...
✓ WAF y protecciones DDoS base configuradas
Implementando Regla de Firewall Personalizada...
✓ Regla de Firewall creada correctamente
=== PROVISIÓN COMPLETADA EXITOSAMENTE ===
```

❌ **No funcionó (Modo Simulación):**
```
WARNING: Cloudflare credentials not configured - running in simulation mode
To enable real protection, configure CF_API_TOKEN and CF_ZONE_ID in Vercel
[1/1] Simulating protection for: midominio.com
Simulation completed - No real changes made to Cloudflare
```

### 2. Verificar en Cloudflare Dashboard

1. Ve a: https://dash.cloudflare.com
2. Selecciona tu dominio
3. Ve a **DNS** → **Records**
4. Busca el registro del dominio que protegiste
5. Debe tener la **🟠 nube naranja** (Proxied)

### 3. Verificar Configuraciones de Seguridad

1. Ve a **SSL/TLS** → **Overview**
   - Debe estar en: **Full (strict)**

2. Ve a **Security** → **Settings**
   - **Security Level:** High
   - **WAF:** On

3. Ve a **Security** → **WAF**
   - Debe existir regla: **"CAS Auto-Provisioned Block Rule"**

---

## ❓ Preguntas Frecuentes

### P: ¿Por qué el proceso se ve igual si hice cambios?

**R:** Porque estás en modo simulación. El script muestra logs similares pero NO hace cambios reales. Necesitas configurar `CF_API_TOKEN` y `CF_ZONE_ID` en Vercel.

### P: Ya configuré las variables pero sigue en simulación

**R:** Debes hacer **redeploy** del proyecto en Vercel. Las variables solo se aplican en nuevos deploys.

### P: ¿Cómo sé si mis credenciales son correctas?

**R:** 
1. Abre `/diagnostico.html`
2. Si ves errores como "Error HTTP 401" o "No se pudo obtener información de la zona", las credenciales son inválidas
3. Si ves "✓ Zona: midominio.com", las credenciales son correctas

### P: ¿Puedo usar el servicio sin credenciales?

**R:** Sí, pero solo en modo simulación. No aplicará protección real. Es útil para probar el flujo del formulario.

### P: ¿Qué dominio debo usar?

**R:** El dominio debe:
- ✅ Estar agregado en Cloudflare
- ✅ Ser el mismo dominio del `CF_ZONE_ID` o un subdominio
- ❌ NO puede ser un dominio diferente

Ejemplo:
- Si `CF_ZONE_ID` es de `midominio.com`
- Puedes proteger: `midominio.com`, `app.midominio.com`, `api.midominio.com`
- NO puedes proteger: `otrodominio.com`

---

## 🚀 Checklist de Activación

Sigue estos pasos en orden:

- [ ] 1. Obtener `CF_API_TOKEN` de Cloudflare
- [ ] 2. Obtener `CF_ZONE_ID` de Cloudflare
- [ ] 3. Agregar ambas variables en Vercel → Settings → Environment Variables
- [ ] 4. Hacer **Redeploy** del proyecto
- [ ] 5. Abrir `/diagnostico.html` y verificar que diga **"MODO REAL"**
- [ ] 6. Enviar el formulario con un dominio válido
- [ ] 7. Verificar que los logs NO digan "WARNING: Cloudflare credentials not configured"
- [ ] 8. Verificar que los logs SÍ digan "Starting REAL Cloudflare protection configuration"
- [ ] 9. Ir a Cloudflare Dashboard y verificar que el registro DNS tenga 🟠
- [ ] 10. Verificar que SSL/TLS esté en "Full (strict)"

Si completaste todos los pasos, **el servicio está funcionando en modo real** ✅

---

## 📞 Soporte

Si después de seguir todos los pasos el servicio sigue en modo simulación:

1. Abre `/diagnostico.html` y toma una captura de pantalla
2. Revisa los logs del formulario y copia el texto completo
3. Verifica en Vercel → Settings → Environment Variables que las variables existan
4. Verifica que hiciste redeploy después de agregar las variables

El problema más común es **olvidar hacer redeploy** después de agregar las variables.
