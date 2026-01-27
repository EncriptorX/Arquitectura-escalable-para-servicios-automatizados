# 🌐 Sistema CSaaS - Guía de Uso

## Descripción

Sistema completo de protección perimetral automatizada usando **Cloudflare for SaaS** que genera subdominios únicos bajo `suncarsrl.com` para proteger URLs de clientes sin necesidad de modificar su DNS.

## 🎯 Características

- ✅ Generación automática de subdominios únicos
- ✅ Creación de registros CNAME proxied
- ✅ Custom Hostnames con SSL/TLS automático (DV por HTTP)
- ✅ Polling hasta activación completa
- ✅ Aplicación automática de reglas de seguridad:
  - WAF Managed Rules
  - HTTPS Redirect
  - Security Level: High
  - Bot Fight Mode
  - Browser Integrity Check
  - Rate Limiting básico
  - Challenge Passage
- ✅ Sin modificación del DNS del cliente
- ✅ Protección inmediata

## 📋 Requisitos Previos

### 1. Cloudflare for SaaS

Debes tener **Cloudflare for SaaS** habilitado en tu zona `suncarsrl.com`. Esto requiere:
- Plan Business o superior
- Contactar a Cloudflare para habilitar la funcionalidad

### 2. Variables de Entorno

Configura las siguientes variables en tu archivo `.env`:

```bash
# API Token de Cloudflare con permisos:
# - Zone:Read
# - Zone Settings:Edit
# - DNS:Edit
# - Firewall Services:Edit
# - SSL and Certificates:Edit
CF_API_TOKEN=tu_token_aqui

# Zone ID de suncarsrl.com
CF_ZONE_ID=tu_zone_id_aqui

# Zona principal para subdominios
CSAAS_ZONE=suncarsrl.com

# CNAME target (se crea automáticamente si no existe)
CSAAS_CNAME_TARGET=customers.suncarsrl.com
```

### 3. Dependencias Python

```bash
pip install -r requirements.txt
```

## 🚀 Uso

### Desde el Frontend

1. Accede a la aplicación web
2. Haz clic en el botón **"Protección CSaaS"**
3. Completa el formulario:
   - **Nombre del Cliente**: Nombre o identificador del cliente
   - **ID del Cliente** (opcional): ID único del cliente
   - **URLs a Proteger**: Dominios FQDN del cliente (ej: `app.cliente.com`)
4. Haz clic en **"Provisionar Protección CSaaS"**
5. Espera a que el sistema complete el provisionamiento (puede tomar 1-5 minutos)
6. Recibirás la URL protegida: `https://cliente-abc123.suncarsrl.com`

### Desde la API

#### Provisionar Cliente

```bash
curl -X POST https://tu-dominio.com/api/csaas-provision \
  -H "Content-Type: application/json" \
  -d '{
    "client_name": "Acme Corporation",
    "client_id": "CLI-123",
    "urls": ["app.acme.com", "api.acme.com"]
  }'
```

**Respuesta exitosa:**

```json
{
  "status": "ok",
  "message": "Cliente provisionado exitosamente en CSaaS",
  "client_key": "CLI-123",
  "subdomain": "acmecorporation-abc12345.suncarsrl.com",
  "protected_url": "https://acmecorporation-abc12345.suncarsrl.com",
  "custom_hostname_id": "ch_abc123...",
  "origin_urls": ["app.acme.com", "api.acme.com"],
  "security_rules": {
    "waf": true,
    "https_redirect": true,
    "security_level": true,
    "bot_fight_mode": true,
    "browser_check": true,
    "challenge_ttl": true,
    "rate_limiting": true
  },
  "logs": [...]
}
```

#### Listar Clientes

```bash
curl https://tu-dominio.com/api/csaas-list
```

**Respuesta:**

```json
{
  "status": "ok",
  "total": 2,
  "clients": [
    {
      "id": "ch_abc123...",
      "hostname": "acmecorporation-abc12345.suncarsrl.com",
      "status": "active",
      "ssl_status": "active",
      "created_at": "2026-01-27T10:30:00Z",
      "verification_errors": []
    }
  ]
}
```

## 🔧 Pruebas

Ejecuta el script de pruebas para verificar que todo funciona:

```bash
python scripts/test_csaas.py
```

Este script verifica:
1. ✅ Configuración de variables de entorno
2. ✅ Generación de subdominios
3. ✅ Validación de datos
4. ✅ Conectividad con API de Cloudflare
5. ✅ Existencia del CNAME target

## 📊 Flujo de Provisionamiento

```
1. Cliente envía formulario
   ↓
2. Sistema genera subdominio único
   ↓
3. Verifica/crea CNAME target (customers.suncarsrl.com)
   ↓
4. Crea registro CNAME proxied
   ↓
5. Crea Custom Hostname en Cloudflare
   ↓
6. Polling hasta status "active" (1-5 min)
   ↓
7. Aplica reglas de seguridad
   ↓
8. Devuelve URL protegida al cliente
```

## 🛡️ Reglas de Seguridad Aplicadas

Cada cliente provisionado recibe automáticamente:

| Regla | Descripción |
|-------|-------------|
| **SSL/TLS Automático** | Certificado DV por HTTP, renovación automática |
| **WAF** | Web Application Firewall con reglas gestionadas |
| **HTTPS Redirect** | Redirección automática de HTTP a HTTPS |
| **Security Level: High** | Nivel de seguridad alto |
| **Bot Fight Mode** | Protección contra bots maliciosos |
| **Browser Integrity Check** | Verificación de integridad del navegador |
| **Rate Limiting** | Limitación de tasa de peticiones |
| **Challenge Passage** | Tiempo de validez de challenges (30 min) |

## 🔍 Troubleshooting

### Error: "CNAME target no encontrado"

El sistema crea automáticamente el CNAME target si no existe. Si falla:

1. Verifica que tienes permisos de DNS:Edit
2. Crea manualmente el registro:
   - Tipo: CNAME
   - Nombre: `customers.suncarsrl.com`
   - Contenido: `suncarsrl.com`
   - Proxied: ✅ Sí

### Error: "Custom Hostname no se activó"

Posibles causas:
- Cloudflare for SaaS no está habilitado en tu zona
- El Custom Hostname está en estado "pending_validation"
- Problemas de conectividad con Cloudflare

Solución:
1. Verifica que Cloudflare for SaaS esté habilitado
2. Espera más tiempo (puede tomar hasta 5 minutos)
3. Revisa los logs en la respuesta del API

### Error: "Rate limiting no se pudo configurar"

El rate limiting básico puede fallar si:
- No tienes permisos de Firewall Services:Edit
- Ya existe una regla con el mismo nombre

Esto no afecta el funcionamiento del sistema, solo es una protección adicional.

## 📝 Notas Importantes

1. **Sin Base de Datos**: Los clientes se almacenan en memoria. En producción, considera usar una base de datos.

2. **CNAME Target**: El CNAME target `customers.suncarsrl.com` debe existir antes de provisionar clientes. El sistema lo crea automáticamente si no existe.

3. **Tiempo de Activación**: El Custom Hostname puede tomar de 1 a 5 minutos en activarse completamente.

4. **Límites de Cloudflare**: Verifica los límites de tu plan de Cloudflare for SaaS (número de Custom Hostnames permitidos).

5. **Producción**: En producción, configura las variables de entorno en Vercel Dashboard > Settings > Environment Variables.

## 🎓 Recursos

- [Cloudflare for SaaS Documentation](https://developers.cloudflare.com/cloudflare-for-platforms/cloudflare-for-saas/)
- [Custom Hostnames API](https://developers.cloudflare.com/api/operations/custom-hostnames-for-a-zone-create-custom-hostname)
- [SSL for SaaS](https://developers.cloudflare.com/cloudflare-for-platforms/cloudflare-for-saas/security/certificate-management/)

## 📧 Soporte

Para problemas o preguntas:
- Email: kevinf@estudiantes.uci.cu
- Teléfono: +53 5695 42 00
