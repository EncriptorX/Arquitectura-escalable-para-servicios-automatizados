# Guía: Demostración con Subdominios

## 🎯 Objetivo

Demostrar el servicio de protección perimetral usando subdominios de tu dominio principal, simulando diferentes clientes.

---

## 📋 Configuración Actual

```
Dominio principal: cuban-cas.vercel.app (o tu dominio propio)
CF_ZONE_ID: Configurado en Vercel
CF_API_TOKEN: Configurado en Vercel

Subdominios para demostración:
- cliente1.cuban-cas.vercel.app
- cliente2.cuban-cas.vercel.app
- cliente3.cuban-cas.vercel.app
- demo.cuban-cas.vercel.app
```

---

## ✅ Cómo Funciona

### 1. Usuario Ingresa un Subdominio

En el formulario, el usuario ingresa:
```
URL: https://cliente1.cuban-cas.vercel.app
```

### 2. Script Valida el Dominio

```python
# El script verifica que el dominio pertenece a la zona
dominio = "cliente1.cuban-cas.vercel.app"
zona = "cuban-cas.vercel.app"

# Validación:
if dominio.endswith(f".{zona}"):  # ✅ Válido
    # Proceder con la protección
```

### 3. Script Aplica Protección

```python
# Crea registro DNS:
POST /zones/{zone_id}/dns_records
{
  "name": "cliente1.cuban-cas.vercel.app",
  "content": "IP_DEL_SERVIDOR",
  "proxied": true  # ← Activa protección
}

# Configura SSL, WAF, DDoS, etc. (a nivel de zona)
```

### 4. Resultado

El subdominio `cliente1.cuban-cas.vercel.app` queda protegido por Cloudflare.

---

## 🚀 Pasos para Implementar

### Paso 1: Preparar Subdominios de Prueba

No necesitas crear los subdominios manualmente. El script los creará automáticamente cuando los uses.

**Subdominios sugeridos:**
- `demo.cuban-cas.vercel.app` - Para demostración general
- `cliente1.cuban-cas.vercel.app` - Simula cliente 1
- `cliente2.cuban-cas.vercel.app` - Simula cliente 2
- `test.cuban-cas.vercel.app` - Para pruebas

### Paso 2: Configurar un Servidor de Prueba

Para que los subdominios funcionen, necesitas un servidor que responda. Opciones:

#### Opción A: Usar Vercel (Recomendado)

Tu aplicación ya está en Vercel, así que puedes usar la misma IP:

```python
# En el script, cuando resuelve la IP:
origin_ip = "76.76.21.21"  # IP de Vercel (ejemplo)
```

#### Opción B: Usar un Servidor Propio

Si tienes un servidor:
```python
origin_ip = "TU_IP_DEL_SERVIDOR"
```

#### Opción C: Usar IP Placeholder

Para demostración pura (sin servidor real):
```python
origin_ip = "192.0.2.1"  # IP de documentación
```

### Paso 3: Actualizar el Formulario (Opcional)

Puedes agregar ejemplos en el placeholder:

```typescript
<input
  type="url"
  value={url}
  onChange={(e) => updateUrl(index, e.target.value)}
  placeholder="https://demo.cuban-cas.vercel.app"  // ← Ejemplo
  className="..."
/>
```

O agregar una nota de ayuda:

```typescript
<p className="text-sm text-gray-400 mt-2">
  💡 Para demostración, usa subdominios como: demo.cuban-cas.vercel.app
</p>
```

---

## 🧪 Pruebas de Demostración

### Prueba 1: Proteger un Subdominio

1. Abre el formulario
2. Ingresa: `https://demo.cuban-cas.vercel.app`
3. Completa el resto del formulario
4. Envía

**Resultado esperado:**
```
✅ MODO REAL ACTIVO
Logs:
- Starting REAL Cloudflare protection configuration...
- ✓ Zona: cuban-cas.vercel.app
- [1/1] Processing domain: demo.cuban-cas.vercel.app
- ✓ Resolved demo.cuban-cas.vercel.app -> 192.0.2.1
- ✓ Dominio 'demo.cuban-cas.vercel.app' validado para la zona
- ✓ Registro DNS creado exitosamente con Proxy activado
- ✓ Modo SSL configurado a Full (Strict)
- ... más logs ...
```

### Prueba 2: Verificar en Cloudflare

1. Ve a https://dash.cloudflare.com
2. Selecciona tu zona
3. Ve a DNS → Records
4. Busca `demo.cuban-cas.vercel.app`
5. Debe tener 🟠 (nube naranja)

### Prueba 3: Proteger Múltiples Subdominios

Ingresa varios subdominios:
```
https://cliente1.cuban-cas.vercel.app
https://cliente2.cuban-cas.vercel.app
https://cliente3.cuban-cas.vercel.app
```

**Resultado:** Todos quedan protegidos.

### Prueba 4: Intentar Dominio Externo (Debe Fallar)

Ingresa: `https://google.com`

**Resultado esperado:**
```
ERROR: El dominio 'google.com' no pertenece a la zona 'cuban-cas.vercel.app'
Solo puede proteger dominios que sean 'cuban-cas.vercel.app' o subdominios
```

---

## 📊 Escenarios de Demostración

### Escenario 1: Cliente Nuevo

**Historia:**
"Un nuevo cliente solicita protección para su aplicación web."

**Demostración:**
1. Cliente ingresa: `cliente1.cuban-cas.vercel.app`
2. Sistema valida y aplica protección
3. Cliente recibe nameservers de Cloudflare
4. Sistema muestra logs de configuración

**Resultado:** Subdominio protegido con SSL, WAF, DDoS.

---

### Escenario 2: Múltiples Aplicaciones

**Historia:**
"Un cliente tiene varias aplicaciones y quiere protegerlas todas."

**Demostración:**
1. Cliente ingresa:
   - `app1.cuban-cas.vercel.app`
   - `app2.cuban-cas.vercel.app`
   - `api.cuban-cas.vercel.app`
2. Sistema procesa cada una
3. Todas quedan protegidas

**Resultado:** Múltiples subdominios protegidos simultáneamente.

---

### Escenario 3: Verificación de Protección

**Historia:**
"Cliente quiere verificar que la protección está activa."

**Demostración:**
1. Ejecutar: `python verificar_proteccion_aplicada.py`
2. Ingresar: `demo.cuban-cas.vercel.app`
3. Sistema muestra:
   - ✅ DNS con Proxy: Activo
   - ✅ SSL/TLS Strict: Activo
   - ✅ Force HTTPS: Activo
   - ✅ WAF: Activo
   - ✅ DDoS Protection: Activo

**Resultado:** Confirmación visual de todas las protecciones.

---

## 📝 Documentación para Tesis

### Sección: Implementación

```
El sistema implementa protección perimetral automatizada mediante la API
de Cloudflare. Para la demostración del prototipo, se utilizan subdominios
de un dominio principal (cuban-cas.vercel.app), donde cada subdominio
representa un cliente diferente.

Subdominios de demostración:
- demo.cuban-cas.vercel.app: Demostración general del sistema
- cliente1.cuban-cas.vercel.app: Simulación de cliente empresarial
- cliente2.cuban-cas.vercel.app: Simulación de segundo cliente
- test.cuban-cas.vercel.app: Entorno de pruebas

Esta arquitectura permite demostrar todas las funcionalidades del sistema
sin requerir múltiples zonas de Cloudflare o credenciales de usuarios reales.
```

### Sección: Escalabilidad

```
El sistema actual utiliza subdominios para demostración, pero la arquitectura
está diseñada para escalar a entornos de producción mediante:

1. Modelo Multi-Tenant: Cada usuario proporciona sus credenciales de Cloudflare,
   permitiendo proteger dominios completamente independientes.

2. Modelo Reseller: El proveedor gestiona múltiples zonas de Cloudflare,
   agregando dominios de clientes a su cuenta.

3. Cloudflare for SaaS: Solución enterprise que permite gestionar dominios
   personalizados de clientes de forma automatizada.

La implementación actual con subdominios demuestra la viabilidad técnica
del concepto, mientras que las opciones de escalabilidad muestran la
adaptabilidad del sistema a diferentes modelos de negocio.
```

### Sección: Limitaciones

```
Limitaciones de la implementación actual:
- Los subdominios deben pertenecer al dominio principal configurado
- No es posible proteger dominios externos sin credenciales del propietario
- Las configuraciones de seguridad (SSL, WAF, DDoS) se aplican a nivel de zona

Estas limitaciones son inherentes al funcionamiento del DNS y las APIs de
Cloudflare, no deficiencias del sistema implementado. En producción, se
resolverían mediante los modelos de escalabilidad mencionados.
```

---

## 🎬 Script de Demostración

Para presentar tu tesis, puedes seguir este script:

### 1. Introducción (2 min)

"El sistema automatiza la configuración de protección perimetral usando
la API de Cloudflare. Voy a demostrar cómo funciona."

### 2. Demostración del Formulario (3 min)

1. Abrir el formulario
2. Llenar datos del cliente
3. Ingresar: `demo.cuban-cas.vercel.app`
4. Completar Turnstile
5. Enviar

### 3. Mostrar Logs en Tiempo Real (2 min)

"Como pueden ver, el sistema muestra logs en tiempo real de cada paso:
- Validación de seguridad
- Resolución de IP
- Configuración de DNS con proxy
- Configuración de SSL/TLS
- Activación de WAF
- Configuración de DDoS
- Creación de reglas de firewall"

### 4. Verificación en Cloudflare (2 min)

1. Abrir Cloudflare Dashboard
2. Mostrar el registro DNS con 🟠
3. Mostrar configuración SSL: Full (strict)
4. Mostrar WAF: On
5. Mostrar Security Level: High

### 5. Script de Verificación (2 min)

```bash
python verificar_proteccion_aplicada.py
```

Mostrar el resumen de protecciones activas.

### 6. Conclusión (1 min)

"El sistema demuestra que es posible automatizar completamente la
configuración de seguridad perimetral, reduciendo el tiempo de
configuración de horas a segundos."

---

## ✅ Checklist de Preparación

Antes de tu presentación:

- [ ] Verifica que `CF_API_TOKEN` y `CF_ZONE_ID` estén configurados en Vercel
- [ ] Haz un deploy reciente del proyecto
- [ ] Prueba el formulario con `demo.cuban-cas.vercel.app`
- [ ] Verifica que aparezca "MODO REAL ACTIVO"
- [ ] Confirma que los logs se muestren correctamente
- [ ] Verifica en Cloudflare Dashboard que el registro se creó
- [ ] Prueba el script `verificar_proteccion_aplicada.py`
- [ ] Prepara capturas de pantalla como respaldo
- [ ] Ten abierto Cloudflare Dashboard en otra pestaña

---

## 🎯 Ventajas de Este Enfoque

1. ✅ **Funcional:** Demuestra que el sistema realmente funciona
2. ✅ **Verificable:** Puedes mostrar los cambios en Cloudflare
3. ✅ **Económico:** No requiere múltiples zonas o plan premium
4. ✅ **Realista:** Simula casos de uso reales
5. ✅ **Escalable:** La arquitectura puede adaptarse a producción
6. ✅ **Académico:** Suficiente para demostrar el concepto en una tesis

---

## 📞 Soporte

Si tienes problemas durante la demostración:

1. **Logs no aparecen:** Revisa la consola del navegador (F12)
2. **Error de credenciales:** Verifica variables en Vercel
3. **Dominio no válido:** Asegúrate de usar subdominios de tu zona
4. **Cloudflare no muestra cambios:** Espera 1-2 minutos y refresca

---

## 🎉 ¡Listo para Demostrar!

Tu sistema está completamente funcional y listo para demostrar en tu tesis.
El uso de subdominios es una solución elegante que muestra la viabilidad
técnica sin las complejidades de un sistema multi-tenant completo.

¡Éxito con tu presentación! 🚀
