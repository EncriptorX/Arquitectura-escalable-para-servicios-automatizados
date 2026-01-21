# Cómo Diagnosticar el Servicio Usando la Consola del Navegador

## 🔍 Paso a Paso para Verificar el Modo Actual

### Paso 1: Abrir la Consola del Navegador

**En Chrome/Edge:**
- Presiona `F12` o `Ctrl+Shift+I` (Windows/Linux)
- Presiona `Cmd+Option+I` (Mac)
- O click derecho → "Inspeccionar" → pestaña "Console"

**En Firefox:**
- Presiona `F12` o `Ctrl+Shift+K` (Windows/Linux)
- Presiona `Cmd+Option+K` (Mac)

### Paso 2: Limpiar la Consola

- Click en el ícono 🚫 o presiona `Ctrl+L` para limpiar logs anteriores

### Paso 3: Enviar el Formulario

1. Llena el formulario con tus datos
2. Ingresa una URL (ej: `https://midominio.com`)
3. Completa el Turnstile
4. Click en "Solicitar Protección"

### Paso 4: Revisar los Logs en la Consola

La consola mostrará información detallada. Busca estos mensajes:

---

## ✅ MODO REAL (Protección Activa)

Si ves estos mensajes, el servicio SÍ está aplicando protección real:

```
📥 Raw output received: {"status":"ok","message":"Protección perimetral configurada exitosamente",...}
📦 Parsed API response: {status: 'ok', simulation_mode: false, ...}
✅ API está en MODO REAL - Protección aplicada
📝 Logs recibidos: 25 líneas
🌐 Nameservers recibidos: ["aron.ns.cloudflare.com", "june.ns.cloudflare.com"]
🎯 Sitios procesados: [{dominio: "midominio.com", estado: "Protección perimetral configurada", ...}]
```

**Indicadores clave:**
- ✅ `simulation_mode: false`
- ✅ `API está en MODO REAL`
- ✅ Nameservers reales de Cloudflare
- ✅ 20+ líneas de logs detallados

---

## ⚠️ MODO SIMULACIÓN (Sin Protección)

Si ves estos mensajes, el servicio NO está aplicando protección real:

```
📥 Raw output received: {"status":"ok","message":"Simulación completada - Configure credenciales de Cloudflare",...}
📦 Parsed API response: {status: 'ok', simulation_mode: true, ...}
⚠️ API está en MODO SIMULACIÓN - No se aplicó protección real
📝 Logs recibidos: 10 líneas
🌐 Nameservers recibidos: ["Configure CF_API_TOKEN and CF_ZONE_ID"]
```

**Indicadores clave:**
- ⚠️ `simulation_mode: true`
- ⚠️ `API está en MODO SIMULACIÓN`
- ⚠️ Nameservers dicen "Configure CF_API_TOKEN..."
- ⚠️ Pocos logs (menos de 15 líneas)

---

## 🔍 Qué Buscar en los Logs

### Logs de Modo Real

Los logs deben incluir estas líneas:

```
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

### Logs de Modo Simulación

Los logs serán mucho más cortos:

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

---

## 🎯 Diferencias Clave

| Característica | Modo Real | Modo Simulación |
|----------------|-----------|-----------------|
| Líneas de logs | 25+ | ~10 |
| Menciona "REAL" | ✅ Sí | ❌ No |
| Menciona "WARNING" | ❌ No | ✅ Sí |
| Resuelve IP | ✅ Sí | ❌ No |
| Obtiene zona | ✅ Sí | ❌ No |
| Configura DNS | ✅ Sí | ❌ No |
| Configura SSL | ✅ Sí | ❌ No |
| Nameservers reales | ✅ Sí | ❌ No |

---

## 🚨 Errores Comunes

### Error 1: No se recibió output

```
⚠️ No se recibió output del API
ERROR: No se recibió respuesta del servidor
```

**Causa:** El backend no está respondiendo o hay un error de red.

**Solución:**
1. Verifica que el proyecto esté deployado en Vercel
2. Revisa los logs de Vercel para ver errores del backend
3. Verifica que la URL del API sea correcta

### Error 2: Error parsing output

```
❌ Error parsing output: SyntaxError: Unexpected token < in JSON at position 0
📄 Output que causó el error: <!DOCTYPE html>...
```

**Causa:** El backend está retornando HTML en lugar de JSON (probablemente una página de error).

**Solución:**
1. Ve a Vercel → Deployments → Functions
2. Busca `/api/solicitar-proteccion`
3. Revisa los logs de la función para ver el error real

### Error 3: Logs no contienen información de protección

```
📝 Logs recibidos: 10 líneas
⚠️ API está en MODO SIMULACIÓN
```

**Causa:** Las credenciales de Cloudflare no están configuradas en Vercel.

**Solución:**
1. Ve a Vercel → Settings → Environment Variables
2. Verifica que existan `CF_API_TOKEN` y `CF_ZONE_ID`
3. Si no existen, agrégalas
4. Haz redeploy del proyecto

---

## 📊 Ejemplo Completo de Consola en Modo Real

```javascript
// Al enviar el formulario, deberías ver:

📥 Raw output received: {
  "status": "ok",
  "message": "Protección perimetral configurada exitosamente",
  "urls": ["https://midominio.com"],
  "sitios": [
    {
      "dominio": "midominio.com",
      "estado": "Protección perimetral configurada",
      "nameservers": ["aron.ns.cloudflare.com", "june.ns.cloudflare.com"],
      "origin_ip": "192.0.2.1"
    }
  ],
  "logs": [
    "Initializing protection setup...",
    "Processing 1 domain(s)...",
    // ... más logs ...
    "=== PROVISIÓN COMPLETADA EXITOSAMENTE ==="
  ],
  "progress": 100,
  "nameservers": ["aron.ns.cloudflare.com", "june.ns.cloudflare.com"],
  "simulation_mode": false  // ← CLAVE: debe ser false
}

📦 Parsed API response: {status: 'ok', simulation_mode: false, ...}
✅ API está en MODO REAL - Protección aplicada
📝 Logs recibidos: 25 líneas
🌐 Nameservers recibidos: (2) ['aron.ns.cloudflare.com', 'june.ns.cloudflare.com']
🎯 Sitios procesados: [{dominio: 'midominio.com', estado: 'Protección perimetral configurada', origin_ip: '192.0.2.1', ...}]
```

---

## ✅ Checklist de Verificación

Usa esta lista para verificar que todo está funcionando:

- [ ] La consola muestra `📥 Raw output received`
- [ ] La consola muestra `📦 Parsed API response`
- [ ] `simulation_mode` es `false` (no `true`)
- [ ] La consola muestra `✅ API está en MODO REAL`
- [ ] Los logs tienen más de 20 líneas
- [ ] Los nameservers son de Cloudflare (no "Configure CF_API_TOKEN...")
- [ ] Los logs incluyen "Starting REAL Cloudflare protection configuration"
- [ ] Los logs incluyen "✓ Registro DNS creado exitosamente con Proxy activado"
- [ ] Los logs incluyen "✓ Modo SSL configurado a Full (Strict)"
- [ ] Los logs incluyen "=== PROVISIÓN COMPLETADA EXITOSAMENTE ==="
- [ ] En la página aparece un banner verde "✅ MODO REAL ACTIVO"
- [ ] NO aparece un banner naranja "⚠️ MODO SIMULACIÓN ACTIVO"

Si todos los items están marcados, **el servicio está funcionando correctamente en modo real** ✅

---

## 🔧 Próximos Pasos

Si confirmaste que está en modo real:

1. **Verifica en Cloudflare Dashboard:**
   - Ve a https://dash.cloudflare.com
   - Selecciona tu dominio
   - Ve a DNS → Records
   - Busca el registro del dominio
   - Debe tener la 🟠 nube naranja (Proxied)

2. **Verifica las configuraciones de seguridad:**
   - SSL/TLS → Overview: debe estar en "Full (strict)"
   - Security → Settings: Security Level debe ser "High"
   - Security → Settings: WAF debe estar "On"

3. **Delega los nameservers:**
   - Ve a tu registrador de dominios
   - Cambia los nameservers a los que aparecen en los logs
   - Espera propagación DNS (puede tardar horas)

Si confirmaste que está en modo simulación:

1. **Configura las credenciales:**
   - Sigue la guía en `README_DIAGNOSTICO.md`
   - Obtén `CF_API_TOKEN` y `CF_ZONE_ID`
   - Configúralos en Vercel
   - Haz redeploy

2. **Verifica nuevamente:**
   - Envía el formulario otra vez
   - Revisa la consola
   - Debe mostrar "MODO REAL"
