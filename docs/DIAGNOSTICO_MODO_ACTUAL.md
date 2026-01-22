# Diagnóstico: ¿Modo Simulación o Modo Real?

## 🔍 Cómo Identificar el Modo Actual

### Opción 1: Revisar los Logs en el Frontend

Cuando envías el formulario, revisa los logs que aparecen. Busca estas líneas:

#### Si ves esto = MODO SIMULACIÓN ❌
```
WARNING: Cloudflare credentials not configured - running in simulation mode
To enable real protection, configure CF_API_TOKEN and CF_ZONE_ID in Vercel
[1/1] Simulating protection for: midominio.com
Simulation completed - No real changes made to Cloudflare
```

#### Si ves esto = MODO REAL ✅
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
```

---

## 🔧 Cómo Verificar las Variables de Entorno en Vercel

### Paso 1: Ir a Vercel Dashboard

1. Abre https://vercel.com/dashboard
2. Selecciona tu proyecto "cuban-cas"
3. Ve a **Settings** → **Environment Variables**

### Paso 2: Verificar que existan estas variables

Debes tener configuradas:

```
CF_API_TOKEN = tu_token_de_cloudflare
CF_ZONE_ID = tu_zone_id
TURNSTILE_SECRET_KEY = tu_turnstile_key
```

### Paso 3: Si NO están configuradas

**Esto explica por qué ves el mismo comportamiento** - el script está corriendo en modo simulación.

---

## 📊 Diferencias entre Modo Simulación y Modo Real

### MODO SIMULACIÓN (Sin credenciales)

**Qué hace:**
- ✅ Valida el formulario
- ✅ Valida Turnstile
- ✅ Valida formato de URLs
- ❌ NO hace llamadas a Cloudflare API
- ❌ NO crea registros DNS
- ❌ NO configura SSL/TLS
- ❌ NO activa WAF
- ❌ NO configura DDoS
- ❌ NO crea reglas de firewall

**Logs que muestra:**
```
Initializing protection setup...
Processing 1 domain(s)...
Validating security token with Cloudflare Turnstile...
✓ Security verification successful
Validating URL formats...
✓ All 1 URLs validated successfully
WARNING: Cloudflare credentials not configured - running in simulation mode
To enable real protection, configure CF_API_TOKEN and CF_ZONE_ID in Vercel
[1/1] Simulating protection for: midominio.com
Simulation completed - No real changes made to Cloudflare
✓ Protection setup completed for 1 domain(s)
Next steps: Update nameservers at your domain registrar
```

**Respuesta JSON:**
```json
{
  "status": "ok",
  "message": "Simulación completada - Configure credenciales de Cloudflare",
  "simulation_mode": true,  ← INDICA SIMULACIÓN
  "nameservers": ["Configure CF_API_TOKEN and CF_ZONE_ID"]
}
```

---

### MODO REAL (Con credenciales)

**Qué hace:**
- ✅ Valida el formulario
- ✅ Valida Turnstile
- ✅ Valida formato de URLs
- ✅ Hace llamada GET a Cloudflare para obtener zona
- ✅ Resuelve IP real del dominio
- ✅ Valida que dominio pertenece a la zona
- ✅ Crea/actualiza registro DNS con proxy
- ✅ Configura SSL/TLS Strict
- ✅ Activa Force HTTPS
- ✅ Activa WAF
- ✅ Configura DDoS Protection
- ✅ Crea regla de firewall

**Logs que muestra:**
```
Initializing protection setup...
Processing 1 domain(s)...
Validating security token with Cloudflare Turnstile...
✓ Security verification successful
Validating URL formats...
✓ All 1 URLs validated successfully
Starting REAL Cloudflare protection configuration...
Using Cloudflare Zone ID: abc12345...
Obteniendo información de la zona de Cloudflare...
✓ Zona: midominio.com
✓ Nameservers: aron.ns.cloudflare.com, june.ns.cloudflare.com
✓ Zona configurada: midominio.com
✓ Solo se pueden proteger: midominio.com y subdominios (ej: app.midominio.com)
[1/1] Processing domain: midominio.com
Resolving IP address for midominio.com...
✓ Resolved midominio.com -> 192.0.2.1
=== INICIANDO PROVISIÓN DE SEGURIDAD PERIMETRAL ===
✓ Dominio 'midominio.com' validado para la zona 'midominio.com'
Configurando protección para dominio: midominio.com
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
✓ Protection setup completed for 1 domain(s)
Next steps: Update nameservers at your domain registrar
```

**Respuesta JSON:**
```json
{
  "status": "ok",
  "message": "Protección perimetral configurada exitosamente",
  "simulation_mode": false,  ← INDICA MODO REAL
  "nameservers": ["aron.ns.cloudflare.com", "june.ns.cloudflare.com"],
  "sitios": [
    {
      "dominio": "midominio.com",
      "estado": "Protección perimetral configurada",
      "origin_ip": "192.0.2.1",
      "nameservers": ["aron.ns.cloudflare.com", "june.ns.cloudflare.com"]
    }
  ]
}
```

---

## 🎯 Cómo Activar el Modo Real

### Paso 1: Obtener CF_API_TOKEN

1. Ve a https://dash.cloudflare.com/profile/api-tokens
2. Click en "Create Token"
3. Usa la plantilla "Edit zone DNS" o crea uno custom con permisos:
   - Zone:Read
   - Zone Settings:Edit
   - DNS:Edit
   - Firewall Services:Edit
4. Copia el token generado

### Paso 2: Obtener CF_ZONE_ID

1. Ve a https://dash.cloudflare.com
2. Selecciona tu dominio
3. En la barra lateral derecha, busca "Zone ID"
4. Copia el Zone ID

### Paso 3: Configurar en Vercel

1. Ve a tu proyecto en Vercel
2. Settings → Environment Variables
3. Agrega:
   ```
   CF_API_TOKEN = tu_token_aqui
   CF_ZONE_ID = tu_zone_id_aqui
   ```
4. Click en "Save"
5. **IMPORTANTE:** Redeploy el proyecto para que tome las nuevas variables

### Paso 4: Verificar

1. Envía el formulario nuevamente
2. Revisa los logs
3. Debes ver "Starting REAL Cloudflare protection configuration..."
4. NO debes ver "WARNING: Cloudflare credentials not configured"

---

## 🧪 Test Rápido: ¿Qué Modo Estoy Usando?

### Test 1: Revisar el mensaje final

**Modo Simulación:**
> "Simulación completada - Configure credenciales de Cloudflare"

**Modo Real:**
> "Protección perimetral configurada exitosamente"

### Test 2: Revisar los nameservers

**Modo Simulación:**
```
Nameservers: Configure CF_API_TOKEN and CF_ZONE_ID
```

**Modo Real:**
```
Nameservers: aron.ns.cloudflare.com, june.ns.cloudflare.com
```

### Test 3: Revisar la cantidad de logs

**Modo Simulación:** ~10 líneas de logs

**Modo Real:** ~25+ líneas de logs con detalles de cada configuración

---

## ❓ Preguntas Frecuentes

### P: ¿Por qué el proceso se ve igual?

**R:** Porque estás en modo simulación. El script muestra logs similares pero NO hace cambios reales en Cloudflare. Configura las credenciales para activar el modo real.

### P: ¿Cómo sé si realmente se aplicó la protección?

**R:** 
1. Revisa que los logs digan "Starting REAL Cloudflare protection configuration"
2. Ve a Cloudflare Dashboard → DNS → Records
3. Verifica que el dominio tenga la nube naranja (Proxied)
4. Ve a Security → Settings y verifica que WAF esté "On"

### P: ¿Puedo probar sin credenciales reales?

**R:** Sí, el modo simulación te permite probar el flujo del formulario, pero NO aplica protección real. Para protección real necesitas credenciales válidas.

### P: ¿Qué pasa si mis credenciales son inválidas?

**R:** El script mostrará errores específicos en los logs, como:
- "Error HTTP 401: Unauthorized" (token inválido)
- "Error HTTP 403: Forbidden" (sin permisos)
- "No se pudo obtener información de la zona" (zone_id inválido)

---

## ✅ Checklist de Verificación

Marca cada item para confirmar que estás en modo real:

- [ ] CF_API_TOKEN está configurado en Vercel
- [ ] CF_ZONE_ID está configurado en Vercel
- [ ] He hecho redeploy después de agregar las variables
- [ ] Los logs muestran "Starting REAL Cloudflare protection configuration"
- [ ] Los logs NO muestran "WARNING: Cloudflare credentials not configured"
- [ ] Los nameservers son de Cloudflare (no "Configure CF_API_TOKEN...")
- [ ] El mensaje final es "Protección perimetral configurada exitosamente"
- [ ] simulation_mode = false en la respuesta JSON

Si todos los items están marcados, estás en **MODO REAL** ✅

Si alguno falta, estás en **MODO SIMULACIÓN** ❌
