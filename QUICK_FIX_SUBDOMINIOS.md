# ⚡ Quick Fix: Subdominios No Funcionan

## 🎯 Solución Más Probable (80% de los casos)

### Problema
El CNAME apunta a `customers.cubansaas.tech` en lugar del dominio del cliente.

### Solución en 3 Pasos

#### 1️⃣ Ir a Cloudflare Dashboard
```
https://dash.cloudflare.com → cubansaas.tech → DNS → Records
```

#### 2️⃣ Editar el CNAME
- Buscar tu subdominio (ej: `testclient-abc123`)
- Hacer clic en "Edit"
- Verificar el campo "Target":
  - ❌ Si dice `customers.cubansaas.tech` → **CAMBIAR**
  - ✅ Debe decir `dominio-del-cliente.com`

#### 3️⃣ Guardar y Esperar
- Guardar cambios
- Esperar 5 minutos
- Probar de nuevo: `https://tu-subdominio.cubansaas.tech`

---

## 🔍 Diagnóstico Automático

Si la solución anterior no funciona, ejecuta:

```bash
python scripts/diagnosticar_subdominio.py <tu-subdominio>.cubansaas.tech
```

El script te dirá exactamente qué está mal.

---

## 📊 Tabla de Errores Comunes

| Error | Causa | Solución Rápida |
|-------|-------|-----------------|
| **404 de Vercel** | CNAME apunta a `customers.cubansaas.tech` | Cambiar CNAME a dominio del cliente |
| **525 SSL Error** | Modo SSL incorrecto | Cloudflare → SSL/TLS → Cambiar a "Flexible" |
| **522 Timeout** | Dominio cliente no responde | Verificar que el dominio del cliente funciona |
| **523 Unreachable** | Dominio cliente no existe | Usar un dominio válido |
| **Timeout** | DNS no propagado | Esperar 5-15 minutos |

---

## ✅ Checklist Rápido

- [ ] El CNAME apunta al dominio del cliente (NO a `customers.cubansaas.tech`)
- [ ] El proxy está activado (nube naranja en Cloudflare)
- [ ] El dominio del cliente funciona: `curl -I https://dominio-cliente.com`
- [ ] Han pasado al menos 5 minutos desde la creación
- [ ] El modo SSL está en "Flexible" o "Full"

---

## 🆘 Si Nada Funciona

Proporciona esta información:

1. **Dominio ingresado**: _______________
2. **Subdominio generado**: _______________
3. **Error que aparece**: _______________
4. **Output de**: `curl -v https://tu-subdominio.cubansaas.tech`
5. **Captura de pantalla del registro DNS en Cloudflare**

---

## 📚 Documentación Completa

- `FIX_SSL_ERROR_525.md` - Explicación detallada
- `GUIA_DIAGNOSTICO_SUBDOMINIOS.md` - Guía paso a paso
- `ESTADO_ACTUAL_SUBDOMINIOS.md` - Estado del proyecto
- `RESUMEN_SITUACION_SUBDOMINIOS.md` - Resumen completo

---

**Última Actualización**: 30 de Enero de 2026
