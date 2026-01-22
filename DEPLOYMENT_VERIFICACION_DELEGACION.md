# Guía de Despliegue - Verificación de Delegación DNS

## Pre-requisitos

Antes de desplegar, asegúrate de tener:

- ✅ Cuenta de Vercel configurada
- ✅ Variables de entorno configuradas:
  - `CF_API_TOKEN`
  - `CF_ZONE_ID`
  - `TURNSTILE_SECRET_KEY`
- ✅ Repositorio Git conectado a Vercel

## Archivos Nuevos Agregados

### Backend
```
api/
└── verificar-delegacion.py    # Nuevo endpoint de verificación
```

### Frontend
```
src/
└── components/
    └── DelegationChecker.tsx  # Nuevo componente de verificación
```

### Dependencias
```
requirements.txt               # Actualizado con dnspython==2.4.2
```

### Documentación
```
VERIFICACION_DELEGACION.md
RESUMEN_VERIFICACION_DELEGACION.md
DIAGRAMA_VERIFICACION_DELEGACION.md
DEPLOYMENT_VERIFICACION_DELEGACION.md
test_verificacion_delegacion.py
```

## Pasos de Despliegue

### 1. Verificar Cambios Localmente

```bash
# Instalar dependencias de Python
pip install -r requirements.txt

# Verificar que dnspython está instalado
pip list | grep dnspython

# Instalar dependencias de Node (si es necesario)
npm install
```

### 2. Verificar TypeScript

```bash
# Compilar TypeScript para verificar errores
npm run build

# O verificar tipos
npx tsc --noEmit
```

### 3. Commit y Push

```bash
# Agregar archivos nuevos
git add api/verificar-delegacion.py
git add src/components/DelegationChecker.tsx
git add requirements.txt
git add *.md
git add test_verificacion_delegacion.py

# Commit
git commit -m "feat: Agregar verificación de delegación DNS

- Nuevo endpoint /api/verificar-delegacion
- Componente DelegationChecker para visualización
- Comparación de nameservers en tiempo real
- Indicadores visuales de estado de delegación
- Documentación completa"

# Push
git push origin main
```

### 4. Despliegue Automático en Vercel

Vercel detectará automáticamente los cambios y desplegará:

1. **Build del Frontend**
   - Compila React/TypeScript
   - Genera archivos estáticos en `/dist`

2. **Deploy de Serverless Functions**
   - Despliega `api/verificar-delegacion.py`
   - Instala dependencias de `requirements.txt`
   - Configura endpoint en `/api/verificar-delegacion`

3. **Variables de Entorno**
   - Vercel usa las variables ya configuradas
   - No necesitas reconfigurar nada

### 5. Verificar Despliegue

Una vez desplegado, verifica:

#### A. Health Check del Endpoint

```bash
# Verificar que el endpoint responde
curl https://tu-dominio.vercel.app/api/verificar-delegacion

# Debería retornar:
{
  "status": "ok",
  "message": "API de verificación de delegación DNS funcionando",
  "has_cloudflare_config": true
}
```

#### B. Prueba de Verificación

```bash
# Probar verificación de un dominio
curl -X POST https://tu-dominio.vercel.app/api/verificar-delegacion \
  -H "Content-Type: application/json" \
  -d '{"dominio": "ejemplo.com"}'
```

#### C. Verificar UI

1. Abre tu aplicación en el navegador
2. Solicita protección para un dominio
3. Verifica que aparece el componente "Verificación de Delegación DNS"
4. Haz clic en "Verificar Ahora"
5. Verifica que muestra el resultado correctamente

## Troubleshooting

### Error: "dnspython not found"

**Problema:** Vercel no instaló dnspython

**Solución:**
```bash
# Verificar que requirements.txt tiene la dependencia
cat requirements.txt | grep dnspython

# Si no está, agrégala
echo "dnspython==2.4.2" >> requirements.txt

# Commit y push
git add requirements.txt
git commit -m "fix: Agregar dnspython a requirements.txt"
git push
```

### Error: "Module 'DelegationChecker' not found"

**Problema:** TypeScript no encuentra el componente

**Solución:**
```bash
# Verificar que el archivo existe
ls src/components/DelegationChecker.tsx

# Verificar imports en ProcessInfoPage.tsx
grep "DelegationChecker" src/components/ProcessInfoPage.tsx

# Rebuild
npm run build
```

### Error: "Cannot resolve DNS"

**Problema:** El servidor de Vercel no puede hacer DNS lookups

**Solución:**
El código ya tiene un fallback que maneja este caso:
- Retorna `delegado: null`
- Muestra mensaje "No se pudo verificar automáticamente"
- Proporciona nameservers esperados para verificación manual

### Error: "Cloudflare API timeout"

**Problema:** La API de Cloudflare no responde a tiempo

**Solución:**
El código ya tiene timeout de 10 segundos y manejo de errores.
Si persiste, verifica:
```bash
# Verificar que CF_API_TOKEN es válido
curl -X GET "https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}" \
  -H "Authorization: Bearer ${CF_API_TOKEN}"
```

## Verificación Post-Despliegue

### Checklist

- [ ] Endpoint `/api/verificar-delegacion` responde a GET
- [ ] Endpoint `/api/verificar-delegacion` responde a POST
- [ ] Componente `DelegationChecker` se renderiza en la UI
- [ ] Botón "Verificar Ahora" funciona
- [ ] Se muestran nameservers esperados
- [ ] Se muestran nameservers actuales (si disponibles)
- [ ] Indicadores de color funcionan correctamente
- [ ] Mensajes en español se muestran correctamente
- [ ] Animaciones funcionan suavemente
- [ ] Responsive design funciona en móvil

### Pruebas Recomendadas

#### Prueba 1: Dominio No Delegado
```
1. Solicitar protección para un dominio que NO está en Cloudflare
2. Hacer clic en "Verificar Ahora"
3. Verificar que muestra: ⏳ "Delegación Pendiente"
4. Verificar que nameservers actuales son diferentes a los esperados
```

#### Prueba 2: Dominio Delegado
```
1. Solicitar protección para un dominio que YA está en Cloudflare
2. Hacer clic en "Verificar Ahora"
3. Verificar que muestra: ✅ "Delegación Exitosa"
4. Verificar que nameservers actuales coinciden con los esperados
```

#### Prueba 3: Dominio Inválido
```
1. Solicitar protección para un dominio que no existe
2. Hacer clic en "Verificar Ahora"
3. Verificar que muestra: ⚠️ "No se pudo verificar"
4. Verificar que proporciona nameservers esperados para verificación manual
```

## Monitoreo

### Logs de Vercel

Para ver logs del endpoint:

1. Ve a tu proyecto en Vercel
2. Click en "Functions"
3. Busca `api/verificar-delegacion`
4. Click para ver logs en tiempo real

### Métricas a Monitorear

- **Tasa de éxito**: % de verificaciones exitosas
- **Tiempo de respuesta**: Debe ser < 5 segundos
- **Errores DNS**: Frecuencia de errores de DNS lookup
- **Errores API**: Frecuencia de errores de Cloudflare API

## Rollback

Si algo sale mal, puedes hacer rollback:

### Opción 1: Rollback en Vercel UI
1. Ve a tu proyecto en Vercel
2. Click en "Deployments"
3. Encuentra el deployment anterior
4. Click en "..." → "Promote to Production"

### Opción 2: Rollback con Git
```bash
# Revertir el último commit
git revert HEAD

# Push
git push origin main
```

## Próximos Pasos

Una vez desplegado exitosamente:

1. **Monitorear** el uso del endpoint durante 24-48 horas
2. **Recopilar feedback** de usuarios sobre la funcionalidad
3. **Considerar mejoras**:
   - Polling automático cada 5 minutos
   - Notificaciones cuando delegación se complete
   - Historial de verificaciones
   - Estimación de tiempo de propagación

## Soporte

Si encuentras problemas:

1. Revisa los logs en Vercel
2. Verifica las variables de entorno
3. Prueba el endpoint directamente con curl
4. Revisa la documentación en `VERIFICACION_DELEGACION.md`

---

**Última actualización:** 22 de enero de 2026
**Estado:** ✅ Listo para despliegue
