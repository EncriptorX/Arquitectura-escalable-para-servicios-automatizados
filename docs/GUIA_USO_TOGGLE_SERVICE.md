# 📖 Guía de Uso: Control del Servicio

## 🎯 Introducción

El sistema de control del servicio permite a los administradores activar o desactivar globalmente el procesamiento de nuevas solicitudes de protección. Esta funcionalidad es útil para:

- 🔧 Mantenimiento programado
- 🚫 Control de acceso temporal
- 🐛 Resolución de problemas
- 📊 Gestión de carga del sistema

## 🖥️ Uso desde la Interfaz Web

### Acceder al Panel de Control

1. Navega a la página principal
2. Click en **"Panel de Control"** en el menú superior
3. Verás el panel con el control del servicio en la parte superior

### Estado del Servicio

El panel muestra claramente el estado actual:

#### Servicio Habilitado (Verde)
```
┌─────────────────────────────────────────┐
│ 🟢 Estado del Servicio                  │
│                                         │
│ El servicio está activo y procesando   │
│ solicitudes                             │
│                                         │
│ [Deshabilitar Servicio]                 │
└─────────────────────────────────────────┘
```

#### Servicio Deshabilitado (Rojo)
```
┌─────────────────────────────────────────┐
│ 🔴 Estado del Servicio                  │
│                                         │
│ El servicio está deshabilitado          │
│ temporalmente                           │
│                                         │
│ ⚠️ No se procesarán nuevas solicitudes │
│                                         │
│ [Habilitar Servicio]                    │
└─────────────────────────────────────────┘
```

### Cambiar el Estado

1. **Para Deshabilitar:**
   - Click en el botón **"Deshabilitar Servicio"**
   - El sistema mostrará una notificación de confirmación
   - El panel se actualizará mostrando el estado deshabilitado
   - Aparecerá una advertencia en rojo

2. **Para Habilitar:**
   - Click en el botón **"Habilitar Servicio"**
   - El sistema mostrará una notificación de confirmación
   - El panel se actualizará mostrando el estado habilitado
   - La advertencia desaparecerá

### Impacto en el Formulario de Solicitud

Cuando el servicio está deshabilitado:

1. **Banner de Advertencia:**
   ```
   ⚠️ Servicio Temporalmente Deshabilitado
   El servicio de protección está deshabilitado.
   No se procesarán solicitudes hasta que se reactive.
   ```

2. **Botón Deshabilitado:**
   - El botón "Solicitar Protección" estará deshabilitado
   - Mostrará el texto "Servicio Deshabilitado"
   - No se podrá enviar el formulario

## 🔌 Uso desde la API

### Obtener Estado del Servicio

**Endpoint:** `GET /api/toggle-service`

**Ejemplo con cURL:**
```bash
curl https://tu-dominio.vercel.app/api/toggle-service
```

**Ejemplo con JavaScript:**
```javascript
const response = await fetch('/api/toggle-service');
const data = await response.json();

console.log(data.service_enabled); // true o false
```

**Response:**
```json
{
  "status": "ok",
  "service_enabled": true,
  "message": "Servicio habilitado"
}
```

### Cambiar Estado del Servicio

**Endpoint:** `POST /api/toggle-service`

**Requiere:** `ADMIN_API_KEY` enviada en `X-Admin-Key` o `Authorization: Bearer`.

**Ejemplo con cURL (Deshabilitar):**
```bash
curl -X POST https://tu-dominio.vercel.app/api/toggle-service \
  -H "Content-Type: application/json" \
  -H "X-Admin-Key: TU_ADMIN_API_KEY" \
  -d '{"enabled": false}'
```

**Ejemplo con cURL (Habilitar):**
```bash
curl -X POST https://tu-dominio.vercel.app/api/toggle-service \
  -H "Content-Type: application/json" \
  -H "X-Admin-Key: TU_ADMIN_API_KEY" \
  -d '{"enabled": true}'
```

**Ejemplo con JavaScript:**
```javascript
async function toggleService(enabled) {
  const response = await fetch('/api/toggle-service', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Key': 'TU_ADMIN_API_KEY'
    },
    body: JSON.stringify({ enabled })
  });
  
  const data = await response.json();
  return data;
}

// Deshabilitar
await toggleService(false);

// Habilitar
await toggleService(true);
```

**Response:**
```json
{
  "status": "ok",
  "service_enabled": false,
  "message": "Servicio deshabilitado exitosamente",
  "previous_state": true
}
```

## 🔍 Verificar Impacto

### Cuando el Servicio está Deshabilitado

Si intentas hacer una solicitud de protección:

```bash
curl -X POST https://tu-dominio.vercel.app/api/solicitar-proteccion \
  -H "Content-Type: application/json" \
  -d '{
    "urls": ["demo.tudominio.com"],
    "turnstileToken": "..."
  }'
```

**Response (503 Service Unavailable):**
```json
{
  "status": "error",
  "message": "El servicio está deshabilitado temporalmente",
  "service_disabled": true
}
```

## 📋 Casos de Uso

### 1. Mantenimiento Programado

**Escenario:** Necesitas realizar mantenimiento en el sistema

**Pasos:**
1. Deshabilitar el servicio desde el panel de control
2. Realizar el mantenimiento necesario
3. Verificar que todo funciona correctamente
4. Habilitar el servicio nuevamente

**Script de Automatización:**
```bash
#!/bin/bash

# Deshabilitar servicio
curl -X POST https://tu-dominio.vercel.app/api/toggle-service \
  -H "Content-Type: application/json" \
  -d '{"enabled": false}'

echo "Servicio deshabilitado. Realizando mantenimiento..."

# Realizar mantenimiento aquí
sleep 300  # 5 minutos de mantenimiento

# Habilitar servicio
curl -X POST https://tu-dominio.vercel.app/api/toggle-service \
  -H "Content-Type: application/json" \
  -d '{"enabled": true}'

echo "Servicio habilitado nuevamente"
```

### 2. Control de Carga

**Escenario:** El sistema está recibiendo demasiadas solicitudes

**Pasos:**
1. Deshabilitar temporalmente el servicio
2. Analizar la causa del alto tráfico
3. Implementar medidas correctivas
4. Habilitar el servicio cuando esté listo

### 3. Resolución de Problemas

**Escenario:** Detectas un problema en la configuración

**Pasos:**
1. Deshabilitar el servicio inmediatamente
2. Investigar y corregir el problema
3. Probar la solución en ambiente de desarrollo
4. Habilitar el servicio en producción

### 4. Ventana de Mantenimiento Programada

**Escenario:** Mantenimiento todos los domingos de 2-4 AM

**Script con cron:**
```bash
# Deshabilitar a las 2 AM
0 2 * * 0 curl -X POST https://tu-dominio.vercel.app/api/toggle-service -H "Content-Type: application/json" -d '{"enabled": false}'

# Habilitar a las 4 AM
0 4 * * 0 curl -X POST https://tu-dominio.vercel.app/api/toggle-service -H "Content-Type: application/json" -d '{"enabled": true}'
```

## 🔐 Consideraciones de Seguridad

### Estado Actual
⚠️ **Importante:** El endpoint actualmente es público y no requiere autenticación.

### Recomendaciones

1. **Implementar Autenticación:**
   ```javascript
   // Ejemplo con token de admin
   const response = await fetch('/api/toggle-service', {
     method: 'POST',
     headers: {
       'Content-Type': 'application/json',
       'Authorization': 'Bearer YOUR_ADMIN_TOKEN'
     },
     body: JSON.stringify({ enabled: false })
   });
   ```

2. **Restringir por IP:**
   - Configurar firewall para permitir solo IPs de administradores
   - Usar Cloudflare Access para proteger el endpoint

3. **Auditoría:**
   - Registrar todos los cambios de estado
   - Incluir timestamp y usuario que realizó el cambio
   - Enviar notificaciones cuando cambia el estado

## 📊 Monitoreo

### Verificar Estado Periódicamente

**Script de Monitoreo:**
```bash
#!/bin/bash

while true; do
  response=$(curl -s https://tu-dominio.vercel.app/api/toggle-service)
  enabled=$(echo $response | jq -r '.service_enabled')
  
  if [ "$enabled" = "false" ]; then
    echo "⚠️ ALERTA: Servicio deshabilitado"
    # Enviar notificación
  else
    echo "✅ Servicio funcionando normalmente"
  fi
  
  sleep 300  # Verificar cada 5 minutos
done
```

### Dashboard de Estado

Puedes crear un dashboard simple que muestre:
- Estado actual del servicio
- Última vez que cambió
- Historial de cambios
- Solicitudes rechazadas por servicio deshabilitado

## ❓ Preguntas Frecuentes

### ¿El estado persiste al reiniciar el servidor?
No, el estado actual se mantiene en memoria. Al reiniciar, el servicio vuelve a estar habilitado por defecto.

### ¿Puedo programar cambios automáticos?
Sí, puedes usar cron jobs o scripts programados para cambiar el estado automáticamente.

### ¿Qué pasa con las solicitudes en proceso?
Las solicitudes que ya están siendo procesadas continuarán hasta completarse. Solo se bloquean las nuevas solicitudes.

### ¿Cómo sé si el servicio está deshabilitado?
- Desde la UI: El panel de control muestra el estado claramente
- Desde la API: Hacer GET a `/api/toggle-service`
- Al intentar solicitar: Recibirás error 503

### ¿Puedo tener diferentes estados por dominio?
No, el estado es global para todo el sistema. Para control granular, considera implementar una lista de dominios permitidos/bloqueados.

## 🚀 Mejoras Futuras

### Persistencia en Base de Datos
```python
# Ejemplo con Supabase
def toggle_service(state: bool):
    global SERVICE_ENABLED
    SERVICE_ENABLED = state
    
    supabase.table('service_config').upsert({
        'key': 'service_enabled',
        'value': state,
        'updated_at': datetime.now(),
        'updated_by': get_current_user()
    }).execute()
    
    return SERVICE_ENABLED
```

### Notificaciones
```python
def toggle_service(state: bool):
    old_state = SERVICE_ENABLED
    SERVICE_ENABLED = state
    
    if old_state != state:
        send_slack_notification(
            f"🔄 Servicio {'habilitado' if state else 'deshabilitado'}"
        )
    
    return SERVICE_ENABLED
```

### Roles y Permisos
```python
def toggle_service(state: bool, user_token: str):
    if not is_admin(user_token):
        raise PermissionError("Solo administradores pueden cambiar el estado")
    
    # ... resto del código
```

## 📞 Soporte

Si tienes problemas o preguntas:
1. Revisa la documentación en `docs/TOGGLE_SERVICE_IMPLEMENTATION.md`
2. Ejecuta los tests: `python scripts/test_toggle_service.py`
3. Verifica los logs del servidor
4. Contacta al equipo de desarrollo

---

**Última actualización:** 26 de Enero, 2026  
**Versión:** 1.0.0
