# 🚀 Guía de Deployment Rápido - cubansaas.tech

## ⚡ Pasos Rápidos (5 minutos)

### 1. Actualizar Variables en Vercel (2 min)

```bash
# Ve a: https://vercel.com/dashboard
# Selecciona tu proyecto → Settings → Environment Variables

# Actualiza estas 4 variables:
CSAAS_ZONE=cubansaas.tech
CSAAS_CNAME_TARGET=customers.cubansaas.tech
CF_ZONE_ID=<copia_de_cloudflare_dashboard>
ALLOWED_HOSTS=localhost,127.0.0.1,*.vercel.app,*.cubansaas.tech

# Aplica a: Production, Preview, Development
# Click "Save"
```

### 2. Obtener Zone ID de Cloudflare (1 min)

```bash
# Ve a: https://dash.cloudflare.com
# Selecciona: cubansaas.tech
# Barra lateral derecha → Zone ID
# Copia el ID (formato: abc123def456...)
```

### 3. Redesplegar (1 min)

```bash
# Opción A: Push a Git (automático)
git add .
git commit -m "Migración a cubansaas.tech"
git push origin main

# Opción B: Deploy manual
vercel --prod
```

### 4. Verificar (1 min)

```bash
# Abre en navegador:
https://tu-proyecto.vercel.app/api/csaas-simple-provision

# Debe mostrar:
{
  "status": "ok",
  "saas_zone": "cubansaas.tech",
  ...
}
```

---

## ✅ Checklist Mínimo

- [ ] Variables actualizadas en Vercel
- [ ] Zone ID correcto de cubansaas.tech
- [ ] Aplicación redesplegada
- [ ] Endpoint responde correctamente

---

## 🧪 Prueba Rápida

```bash
# Probar provisionamiento
curl -X POST https://tu-proyecto.vercel.app/api/csaas-simple-provision \
  -H "Content-Type: application/json" \
  -d '{"client_name":"Test","urls":["example.com"]}'

# Debe retornar:
{
  "status": "ok",
  "subdomain": "test-abc12345.cubansaas.tech",
  "protected_url": "https://test-abc12345.cubansaas.tech",
  ...
}
```

---

## 🆘 Si Algo Falla

### Error: "Host no autorizado"
```bash
# Verifica ALLOWED_HOSTS en Vercel
# Debe incluir: *.cubansaas.tech
```

### Error: "Zone ID inválido"
```bash
# Verifica CF_ZONE_ID en Vercel
# Debe ser el Zone ID de cubansaas.tech (no de otro dominio)
```

### Error: "Cloudflare API"
```bash
# Verifica CF_API_TOKEN en Vercel
# Debe tener permisos: Zone:Read, DNS:Edit, Zone Settings:Edit
```

---

## 📱 Contacto Rápido

**Logs de Vercel:** https://vercel.com/dashboard → Tu Proyecto → Deployments → Logs  
**DNS de Cloudflare:** https://dash.cloudflare.com → cubansaas.tech → DNS  
**Verificación Local:** `python scripts/test_migration.py`

---

**Tiempo Total:** ~5 minutos  
**Dificultad:** Fácil  
**Requisitos:** Acceso a Vercel y Cloudflare
