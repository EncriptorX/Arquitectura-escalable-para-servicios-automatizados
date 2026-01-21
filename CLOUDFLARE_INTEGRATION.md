# Integración de Protección Perimetral Cloudflare

## 🎯 Resumen

La API ahora ejecuta **protección REAL** de Cloudflare cuando se envía el formulario. El script `cloudflare_protect.py` ha sido integrado completamente en `api/solicitar-proteccion.py`.

## 🔧 Configuración Requerida en Vercel

Para que la protección funcione, debes configurar estas variables de entorno en Vercel:

### Variables Obligatorias:

1. **`TURNSTILE_SECRET_KEY`** ✅ (Ya configurada)
   - Clave secreta de Cloudflare Turnstile para validación de seguridad

2. **`CF_API_TOKEN`** ⚠️ (REQUERIDA para protección real)
   - Token de API de Cloudflare con permisos de:
     - Zone:Read
     - Zone Settings:Edit
     - DNS:Edit
     - Firewall Services:Edit
   
3. **`CF_ZONE_ID`** ⚠️ (REQUERIDA para protección real)
   - ID de la zona de Cloudflare donde se configurará la protección
   - Formato: `32 caracteres hexadecimales`

4. **`CF_ACCOUNT_ID`** (Opcional)
   - ID de cuenta de Cloudflare

### Cómo obtener estas credenciales:

#### CF_API_TOKEN:
1. Ve a https://dash.cloudflare.com/profile/api-tokens
2. Clic en "Create Token"
3. Usa la plantilla "Edit zone DNS" o crea uno personalizado con los permisos mencionados
4. Copia el token generado

#### CF_ZONE_ID:
1. Ve a https://dash.cloudflare.com
2. Selecciona tu dominio
3. En la barra lateral derecha, sección "API", encontrarás el "Zone ID"

## 🚀 Modos de Operación

### Modo Simulación (Actual)
**Cuando NO están configuradas las credenciales de Cloudflare:**

```json
{
  "status": "ok",
  "message": "Simulación completada - Configure credenciales de Cloudflare",
  "simulation_mode": true,
  "logs": [
    "WARNING: Cloudflare credentials not configured - running in simulation mode",
    "To enable real protection, configure CF_API_TOKEN and CF_ZONE_ID in Vercel"
  ]
}
```

### Modo Producción (Con credenciales)
**Cuando SÍ están configuradas las credenciales:**

```json
{
  "status": "ok",
  "message": "Protección perimetral configurada exitosamente",
  "simulation_mode": false,
  "nameservers": ["ns1.cloudflare.com", "ns2.cloudflare.com"],
  "logs": [
    "=== INICIANDO PROVISIÓN DE SEGURIDAD PERIMETRAL ===",
    "✓ Registro DNS creado exitosamente con Proxy activado",
    "✓ Modo SSL configurado a Full (Strict)",
    "✓ Redirección HTTPS forzada activada",
    "✓ WAF y protecciones DDoS base configuradas",
    "=== PROVISIÓN COMPLETADA EXITOSAMENTE ==="
  ]
}
```

## 🛡️ Protecciones Implementadas

Cuando se ejecuta en modo producción, el script configura:

### 1. **DNS con Proxy (Nube Naranja)**
- Crea/actualiza registros DNS tipo A
- Activa el proxy de Cloudflare (`proxied: true`)
- Oculta la IP real del servidor origen

### 2. **SSL/TLS Strict**
- Configura cifrado end-to-end
- Modo: Full (Strict)
- Requiere certificado válido en el origen

### 3. **Force HTTPS**
- Redirección automática HTTP → HTTPS
- Configuración: `always_use_https: on`

### 4. **WAF (Web Application Firewall)**
- Protección contra ataques OWASP Top 10
- Configuración: `waf: on`

### 5. **DDoS Protection**
- Nivel de seguridad: High
- Sensibilidad aumentada para desafíos CAPTCHA

### 6. **Firewall Custom Rules**
- Bloqueo de países específicos
- Bloqueo de User-Agents maliciosos
- Expresión: `(ip.geoip.country eq "XX") or (http.user_agent contains "BadBot")`

## 📊 Logs en Tiempo Real

Los logs mostrados en el frontend corresponden 100% a las operaciones reales ejecutadas:

```
Initializing protection setup...
Processing 1 domain(s)...
Validating security token with Cloudflare Turnstile...
✓ Security verification successful
Validating URL formats...
✓ All 1 URLs validated successfully
Starting REAL Cloudflare protection configuration...
Using Cloudflare Zone ID: 1a2b3c4d...
[1/1] Processing domain: example.com
=== INICIANDO PROVISIÓN DE SEGURIDAD PERIMETRAL ===
Obteniendo nameservers de Cloudflare...
✓ Nameservers obtenidos: ns1.cloudflare.com, ns2.cloudflare.com
Configurando DNS para example.com -> 203.0.113.10 (A)...
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

## 🔍 Testing

### Test en Modo Simulación (Sin credenciales):
```bash
curl -X POST https://cuban-cas.vercel.app/api/solicitar-proteccion \
  -H "Content-Type: application/json" \
  -d '{
    "urls": ["example.com"],
    "turnstileToken": "valid-token"
  }'
```

### Test en Modo Producción (Con credenciales):
1. Configura `CF_API_TOKEN` y `CF_ZONE_ID` en Vercel
2. Redeploy la aplicación
3. Envía el formulario desde el frontend
4. Verifica en Cloudflare Dashboard que se crearon:
   - Registro DNS con proxy activado
   - Configuraciones SSL/TLS
   - Reglas de firewall

## ⚠️ Consideraciones Importantes

### IP de Origen
Actualmente usa una IP placeholder: `203.0.113.10`

**Para producción**, debes:
1. Obtener la IP real del servidor origen
2. Pasarla en el request o configurarla como variable de entorno
3. O implementar DNS lookup automático

### Nameservers
Los usuarios deben:
1. Copiar los nameservers mostrados en la UI
2. Ir a su registrador de dominios
3. Reemplazar los nameservers actuales
4. Esperar propagación DNS (minutos a horas)

### Límites de Cloudflare
- Algunas funciones requieren planes superiores (Pro, Business, Enterprise)
- Las reglas de firewall custom pueden tener límites según el plan
- Verifica los límites de tu plan en: https://www.cloudflare.com/plans/

## 🐛 Troubleshooting

### Error: "Cloudflare credentials not configured"
**Solución**: Configura `CF_API_TOKEN` y `CF_ZONE_ID` en Vercel

### Error: "Error HTTP 403"
**Solución**: Verifica que el token tenga los permisos correctos

### Error: "Zone not found"
**Solución**: Verifica que el `CF_ZONE_ID` sea correcto

### Logs muestran "WARN" en firewall rules
**Solución**: Normal si usas plan Free. Las reglas custom requieren plan superior.

## 📚 Referencias

- [Cloudflare API Docs](https://developers.cloudflare.com/api/)
- [Cloudflare Zone Settings](https://developers.cloudflare.com/api/operations/zone-settings-get-all-zone-settings)
- [Cloudflare DNS Records](https://developers.cloudflare.com/api/operations/dns-records-for-a-zone-list-dns-records)
- [Cloudflare Firewall Rules](https://developers.cloudflare.com/firewall/api/)
