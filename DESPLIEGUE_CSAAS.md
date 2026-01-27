# 🚀 Guía de Despliegue - Sistema CSaaS

## Estado: ✅ Listo para Producción

---

## 📋 Pre-requisitos

### 1. Cloudflare for SaaS

**IMPORTANTE**: Debes tener Cloudflare for SaaS habilitado en tu zona `suncarsrl.com`.

- **Plan requerido**: Business o superior
- **Cómo habilitar**: Contacta a Cloudflare Support o tu Account Manager
- **Verificar**: Dashboard de Cloudflare > SSL/TLS > Custom Hostnames

### 2. Permisos de API Token

Tu `CF_API_TOKEN` debe tener los siguientes permisos:

- ✅ Zone:Read
- ✅ Zone Settings:Edit
- ✅ DNS:Edit
- ✅ SSL and Certificates:Edit
- ✅ Firewall Services:Edit

**Crear token**: https://dash.cloudflare.com/profile/api-tokens

### 3. Zona Configurada

- Zona: `suncarsrl.com`
- Estado: Active
- Plan: Business o superior

---

## 🔧 Configuración Local (Desarrollo)

### 1. Clonar el repositorio

```bash
git clone <tu-repo>
cd <tu-proyecto>
```

### 2. Instalar dependencias

```bash
# Frontend
npm install

# Backend (opcional para desarrollo local)
pip install -r requirements.txt
```

### 3. Configurar variables de entorno

Copia `.env.example` a `.env` y configura:

```bash
cp .env.example .env
```

Edita `.env`:

```env
# Cloudflare API
CF_API_TOKEN=tu_token_real_aqui
CF_ZONE_ID=tu_zone_id_aqui

# Turnstile
VITE_TURNSTILE_SITE_KEY=tu_site_key_aqui
TURNSTILE_SECRET_KEY=tu_secret_key_aqui

# CSaaS
CSAAS_ZONE=suncarsrl.com
CSAAS_CNAME_TARGET=customers.suncarsrl.com
```

### 4. Ejecutar en desarrollo

```bash
npm run dev
```

Accede a: http://localhost:5173

### 5. Probar el sistema

```bash
# Ejecutar pruebas automatizadas
python scripts/test_csaas.py

# Ejecutar demo interactivo
python scripts/demo_csaas.py
```

---

## 🌐 Despliegue en Vercel (Producción)

### Paso 1: Preparar el repositorio

Asegúrate de que todos los archivos estén commiteados:

```bash
git add .
git commit -m "Sistema CSaaS completo"
git push origin main
```

### Paso 2: Conectar con Vercel

1. Ve a https://vercel.com
2. Clic en "New Project"
3. Importa tu repositorio de Git
4. Vercel detectará automáticamente la configuración

### Paso 3: Configurar variables de entorno

En Vercel Dashboard > Settings > Environment Variables, agrega:

```
CF_API_TOKEN=tu_token_real
CF_ZONE_ID=tu_zone_id_real
VITE_TURNSTILE_SITE_KEY=tu_site_key_real
TURNSTILE_SECRET_KEY=tu_secret_key_real
CSAAS_ZONE=suncarsrl.com
CSAAS_CNAME_TARGET=customers.suncarsrl.com
```

**IMPORTANTE**: Marca todas como disponibles en:
- ✅ Production
- ✅ Preview
- ✅ Development

### Paso 4: Deploy

Vercel desplegará automáticamente. El proceso incluye:

1. ✅ Build del frontend (Vite)
2. ✅ Deploy de funciones serverless Python
3. ✅ Configuración de rutas (vercel.json)

### Paso 5: Verificar despliegue

1. Accede a tu URL de Vercel (ej: `tu-proyecto.vercel.app`)
2. Prueba el formulario CSaaS
3. Verifica que los endpoints funcionen:
   - `https://tu-proyecto.vercel.app/api/csaas-provision`
   - `https://tu-proyecto.vercel.app/api/csaas-list`

---

## 🔍 Verificación Post-Despliegue

### 1. Verificar CNAME Target

El sistema crea automáticamente el CNAME target si no existe, pero puedes verificarlo manualmente:

```bash
# Usando la API de Cloudflare
curl -X GET "https://api.cloudflare.com/client/v4/zones/TU_ZONE_ID/dns_records?name=customers.suncarsrl.com" \
  -H "Authorization: Bearer TU_API_TOKEN" \
  -H "Content-Type: application/json"
```

Si no existe, créalo manualmente:

```bash
curl -X POST "https://api.cloudflare.com/client/v4/zones/TU_ZONE_ID/dns_records" \
  -H "Authorization: Bearer TU_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "CNAME",
    "name": "customers.suncarsrl.com",
    "content": "suncarsrl.com",
    "proxied": true,
    "ttl": 1
  }'
```

### 2. Probar provisionamiento

Desde el frontend:

1. Clic en "Protección CSaaS"
2. Completa el formulario:
   - Nombre: "Test Client"
   - URLs: "test.example.com"
3. Clic en "Provisionar"
4. Espera 1-5 minutos
5. Verifica que recibas la URL protegida

Desde la API:

```bash
curl -X POST "https://tu-proyecto.vercel.app/api/csaas-provision" \
  -H "Content-Type: application/json" \
  -d '{
    "client_name": "Test Client",
    "urls": ["test.example.com"]
  }'
```

### 3. Verificar Custom Hostname en Cloudflare

1. Ve a Cloudflare Dashboard
2. Selecciona tu zona `suncarsrl.com`
3. SSL/TLS > Custom Hostnames
4. Verifica que aparezca el subdominio generado
5. Estado debe ser "Active"
6. SSL debe ser "Active"

---

## 🐛 Troubleshooting

### Error: "Cloudflare for SaaS no habilitado"

**Síntoma**: Error al crear Custom Hostname

**Solución**:
1. Verifica que tu plan sea Business o superior
2. Contacta a Cloudflare Support para habilitar CSaaS
3. Espera confirmación de habilitación

### Error: "CNAME target no encontrado"

**Síntoma**: Error en paso de verificación de CNAME target

**Solución**:
1. El sistema lo crea automáticamente
2. Si falla, créalo manualmente (ver arriba)
3. Verifica permisos de DNS:Edit en tu API token

### Error: "Custom Hostname no se activó"

**Síntoma**: Timeout después de 5 minutos

**Solución**:
1. Verifica en Cloudflare Dashboard el estado del Custom Hostname
2. Puede estar en "pending_validation"
3. Espera más tiempo (puede tomar hasta 10 minutos)
4. Verifica que no haya errores de validación

### Error: "Rate limiting no se pudo configurar"

**Síntoma**: Warning en logs sobre rate limiting

**Solución**:
- Esto es normal y no afecta el funcionamiento
- Rate limiting básico puede fallar en algunos planes
- Las otras 6 reglas de seguridad se aplican correctamente

### Error: "Service Disabled"

**Síntoma**: Error 503 al provisionar

**Solución**:
1. Verifica que el servicio esté habilitado
2. Ve al Panel de Control
3. Activa el servicio si está deshabilitado

---

## 📊 Monitoreo

### Logs en Vercel

1. Ve a Vercel Dashboard
2. Selecciona tu proyecto
3. Clic en "Functions"
4. Selecciona `csaas-provision` o `csaas-list`
5. Revisa los logs de ejecución

### Logs en Cloudflare

1. Ve a Cloudflare Dashboard
2. Analytics > Logs
3. Filtra por Custom Hostnames
4. Revisa eventos de SSL y validación

### Métricas importantes

- **Tiempo de provisionamiento**: 1-5 minutos (normal)
- **Tasa de éxito**: >95% (esperado)
- **Tiempo de activación SSL**: 30 segundos - 3 minutos

---

## 🔒 Seguridad

### Variables de entorno

- ✅ Nunca commitear `.env` a Git
- ✅ Usar variables de entorno en Vercel
- ✅ Rotar API tokens periódicamente
- ✅ Usar tokens con permisos mínimos necesarios

### API Tokens

- ✅ Crear tokens específicos por proyecto
- ✅ No usar Global API Key
- ✅ Revisar permisos regularmente
- ✅ Revocar tokens no utilizados

### CORS

El sistema ya tiene CORS configurado para:
- `http://localhost:5173` (desarrollo)
- `http://localhost:3000` (desarrollo)
- `https://*.vercel.app` (producción)

---

## 📈 Escalabilidad

### Límites de Cloudflare for SaaS

Verifica los límites de tu plan:

- **Free**: No disponible
- **Pro**: No disponible
- **Business**: 100 Custom Hostnames
- **Enterprise**: Ilimitado (contactar ventas)

### Almacenamiento

Actualmente el sistema usa memoria (dict Python). Para producción a gran escala:

1. Considera usar una base de datos (PostgreSQL, MongoDB)
2. Implementa caché (Redis)
3. Usa Supabase para almacenamiento persistente

### Rate Limiting

Considera implementar rate limiting en Vercel:

```javascript
// vercel.json
{
  "functions": {
    "api/csaas-provision.py": {
      "maxDuration": 300,
      "memory": 1024
    }
  }
}
```

---

## 🎯 Checklist de Despliegue

Antes de ir a producción, verifica:

- [ ] Cloudflare for SaaS habilitado
- [ ] API Token con permisos correctos
- [ ] Variables de entorno configuradas en Vercel
- [ ] CNAME target existe o se crea automáticamente
- [ ] Pruebas automatizadas pasando
- [ ] Build del frontend exitoso
- [ ] Endpoints de API funcionando
- [ ] Provisionamiento de prueba exitoso
- [ ] Custom Hostname activo en Cloudflare
- [ ] SSL activo y funcionando
- [ ] Reglas de seguridad aplicadas
- [ ] Logs funcionando correctamente
- [ ] Documentación revisada

---

## 📞 Soporte

Si encuentras problemas:

1. Revisa los logs en Vercel
2. Revisa el estado en Cloudflare Dashboard
3. Ejecuta `python scripts/test_csaas.py`
4. Consulta `scripts/README_CSAAS.md`
5. Contacta: kevinf@estudiantes.uci.cu

---

## 🎉 ¡Listo!

Tu sistema CSaaS está desplegado y listo para provisionar clientes con protección perimetral automática usando Cloudflare for SaaS.

**Próximos pasos**:
1. Provisiona tu primer cliente real
2. Monitorea el proceso
3. Verifica la activación
4. Comparte la URL protegida con el cliente

---

**Fecha**: 27 de enero de 2026  
**Versión**: 1.0.0  
**Estado**: ✅ Listo para Producción
