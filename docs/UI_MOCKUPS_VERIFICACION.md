# 🎨 Mockups de UI - Verificación de Delegación DNS

## Vista General del Componente

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                           │
│  🔍 Verificación de Delegación DNS                    [Verificar Ahora]  │
│                                                                           │
│  Verifica si tu dominio ejemplo.com ya fue delegado correctamente a      │
│  Cloudflare. Esto es necesario para que la protección funcione.          │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Estado 1: Inicial (Sin verificar)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                           │
│  🔍 Verificación de Delegación DNS                    [Verificar Ahora]  │
│                                                                           │
│  Verifica si tu dominio ejemplo.com ya fue delegado correctamente a      │
│  Cloudflare. Esto es necesario para que la protección funcione.          │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │                                                                       │ │
│  │                          🔄                                           │ │
│  │                                                                       │ │
│  │         Haz clic en "Verificar Ahora" para comprobar                 │ │
│  │         el estado de delegación DNS                                  │ │
│  │                                                                       │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Estado 2: Verificando (Loading)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                           │
│  🔍 Verificación de Delegación DNS                    [Verificando...]   │
│                                                                           │
│  Verifica si tu dominio ejemplo.com ya fue delegado correctamente a      │
│  Cloudflare. Esto es necesario para que la protección funcione.          │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │                                                                       │ │
│  │                          ⏳                                           │ │
│  │                                                                       │ │
│  │         Verificando delegación DNS...                                │ │
│  │         Por favor espera                                             │ │
│  │                                                                       │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Estado 3: Delegación Exitosa ✅

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                           │
│  🔍 Verificación de Delegación DNS                    [Verificar Ahora]  │
│                                                                           │
│  Verifica si tu dominio ejemplo.com ya fue delegado correctamente a      │
│  Cloudflare. Esto es necesario para que la protección funcione.          │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │ ✅ DELEGACIÓN EXITOSA                                                │ │
│  │                                                                       │ │
│  │ El dominio 'ejemplo.com' está correctamente delegado a Cloudflare.   │ │
│  │ El sistema puede continuar con la provisión de seguridad.            │ │
│  │                                                                       │ │
│  │ [Sistema puede continuar]                                            │ │
│  │                                                                       │ │
│  │ ┌───────────────────────────────┬───────────────────────────────┐   │ │
│  │ │ 📋 Nameservers Esperados      │ 🌐 Nameservers Actuales       │   │ │
│  │ │ (Cloudflare)                  │ (Tu Dominio)                  │   │ │
│  │ ├───────────────────────────────┼───────────────────────────────┤   │ │
│  │ │ ns1.cloudflare.com            │ ns1.cloudflare.com        ✓   │   │ │
│  │ │ ns2.cloudflare.com            │ ns2.cloudflare.com        ✓   │   │ │
│  │ └───────────────────────────────┴───────────────────────────────┘   │ │
│  │                                                                       │ │
│  │ Última verificación: 22/01/2026 10:30:45                             │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Estado 4: Delegación Pendiente ⏳

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                           │
│  🔍 Verificación de Delegación DNS                    [Verificar Ahora]  │
│                                                                           │
│  Verifica si tu dominio ejemplo.com ya fue delegado correctamente a      │
│  Cloudflare. Esto es necesario para que la protección funcione.          │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │ ⏳ DELEGACIÓN PENDIENTE                                              │ │
│  │                                                                       │ │
│  │ El dominio 'ejemplo.com' aún NO está delegado a Cloudflare.         │ │
│  │ Por favor actualiza los nameservers en tu registrador y espera la    │ │
│  │ propagación DNS (puede tomar hasta 48 horas).                        │ │
│  │                                                                       │ │
│  │ [Acción requerida]                                                   │ │
│  │                                                                       │ │
│  │ ┌───────────────────────────────┬───────────────────────────────┐   │ │
│  │ │ 📋 Nameservers Esperados      │ 🌐 Nameservers Actuales       │   │ │
│  │ │ (Cloudflare)                  │ (Tu Dominio)                  │   │ │
│  │ ├───────────────────────────────┼───────────────────────────────┤   │ │
│  │ │ ns1.cloudflare.com            │ ns1.registrador.com       ✗   │   │ │
│  │ │ ns2.cloudflare.com            │ ns2.registrador.com       ✗   │   │ │
│  │ └───────────────────────────────┴───────────────────────────────┘   │ │
│  │                                                                       │ │
│  │ Última verificación: 22/01/2026 10:30:45                             │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Estado 5: No se pudo verificar ⚠️

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                           │
│  🔍 Verificación de Delegación DNS                    [Verificar Ahora]  │
│                                                                           │
│  Verifica si tu dominio ejemplo.com ya fue delegado correctamente a      │
│  Cloudflare. Esto es necesario para que la protección funcione.          │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │ ⚠️ NO SE PUDO VERIFICAR                                             │ │
│  │                                                                       │ │
│  │ No se pudo verificar nameservers actuales del dominio.               │ │
│  │ Verifica manualmente que los nameservers de tu dominio coincidan     │ │
│  │ con los esperados.                                                    │ │
│  │                                                                       │ │
│  │ Error: No se pudo resolver el dominio                                │ │
│  │                                                                       │ │
│  │ ┌─────────────────────────────────────────────────────────────────┐ │ │
│  │ │ 📋 Nameservers Esperados (Cloudflare)                            │ │ │
│  │ ├─────────────────────────────────────────────────────────────────┤ │ │
│  │ │ ns1.cloudflare.com                                               │ │ │
│  │ │ ns2.cloudflare.com                                               │ │ │
│  │ └─────────────────────────────────────────────────────────────────┘ │ │
│  │                                                                       │ │
│  │ Última verificación: 22/01/2026 10:30:45                             │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Vista Completa en ProcessInfoPage

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         SecurePerimeter                    [Volver] [Nueva]│
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ ⚠️ MODO SIMULACIÓN ACTIVO                                                │
│                                                                           │
│ El servicio está corriendo en modo simulación. No se aplicó protección   │
│ real de Cloudflare.                                                       │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ Deployment Status                                    [WAITING_DNS]       │
│                                                                           │
│ Configurando protección perimetral para tu dominio                       │
│                                                                           │
│ Target Domains: 1 domain(s)                                              │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ Overall Progress                                              100%       │
│ ████████████████████████████████████████████████████████████████         │
│                                                                           │
│ [Analyzing ✓] [Provisioning ✓] [Securing ✓] [Finalizing ✓]             │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ ⚠️ Acción Requerida: Delegación DNS                                     │
│                                                                           │
│ ¿Qué es la delegación DNS? Es el proceso de transferir el control de    │
│ tu dominio a los servidores de Cloudflare para que la protección        │
│ funcione correctamente.                                                  │
│                                                                           │
│ 📋 Nameservers asignados por Cloudflare:                                │
│ ┌─────────────────────────────┬─────────────────────────────┐          │
│ │ ns1.cloudflare.com     [📋] │ ns2.cloudflare.com     [📋] │          │
│ └─────────────────────────────┴─────────────────────────────┘          │
│                                                                           │
│ 📝 Pasos a seguir:                                                       │
│ 1. Accede al panel de control de tu registrador de dominios             │
│ 2. Busca la sección de "DNS", "Nameservers" o "Servidores de nombres"  │
│ 3. Elimina los nameservers actuales de tu dominio                       │
│ 4. Agrega los nameservers de Cloudflare mostrados arriba                │
│ 5. Guarda los cambios en tu registrador                                 │
│ 6. Espera la propagación DNS (15 min a 48 horas, típicamente 1-2 horas)│
│                                                                           │
│ ⏳ Esperando propagación DNS...                                          │
│ Una vez actualices los nameservers, la protección se activará           │
│ automáticamente cuando la propagación DNS se complete.                   │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                                                                           │
│  🔍 Verificación de Delegación DNS                    [Verificar Ahora]  │
│                                                                           │
│  Verifica si tu dominio ejemplo.com ya fue delegado correctamente a      │
│  Cloudflare. Esto es necesario para que la protección funcione.          │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │ ⏳ DELEGACIÓN PENDIENTE                                              │ │
│  │                                                                       │ │
│  │ El dominio 'ejemplo.com' aún NO está delegado a Cloudflare.         │ │
│  │ Por favor actualiza los nameservers en tu registrador y espera la    │ │
│  │ propagación DNS (puede tomar hasta 48 horas).                        │ │
│  │                                                                       │ │
│  │ [Acción requerida]                                                   │ │
│  │                                                                       │ │
│  │ ┌───────────────────────────────┬───────────────────────────────┐   │ │
│  │ │ 📋 Nameservers Esperados      │ 🌐 Nameservers Actuales       │   │ │
│  │ │ (Cloudflare)                  │ (Tu Dominio)                  │   │ │
│  │ ├───────────────────────────────┼───────────────────────────────┤   │ │
│  │ │ ns1.cloudflare.com            │ ns1.registrador.com       ✗   │   │ │
│  │ │ ns2.cloudflare.com            │ ns2.registrador.com       ✗   │   │ │
│  │ └───────────────────────────────┴───────────────────────────────┘   │ │
│  │                                                                       │ │
│  │ Última verificación: 22/01/2026 10:30:45                             │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ Protected Domains                                                         │
│                                                                           │
│ https://ejemplo.com                                      [Processing]    │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ Live Execution Logs                                                       │
│                                                                           │
│ $ Initializing protection setup...                                       │
│ $ Processing 1 domain(s)...                                              │
│ $ Validating security token with Cloudflare Turnstile...                │
│ $ ✓ Security verification successful                                     │
│ $ Validating URL formats...                                              │
│ $ ✓ All 1 URLs validated successfully                                    │
│ $ Starting REAL Cloudflare protection configuration...                   │
│ $ Using Cloudflare Zone ID: 1234abcd...                                 │
│ $ [INFO] Obteniendo información de la zona de Cloudflare...             │
│ $ ✓ Zona: ejemplo.com                                                    │
│ $ ✓ Nameservers: ns1.cloudflare.com, ns2.cloudflare.com                │
│ $ ✓ Zona configurada: ejemplo.com                                        │
│ $ [1/1] Processing domain: ejemplo.com                                   │
│ $ Resolving IP address for ejemplo.com...                                │
│ $ ✓ Resolved ejemplo.com -> 203.0.113.10                                │
│ $ === INICIANDO PROVISIÓN DE SEGURIDAD PERIMETRAL ===                   │
│ $ ✓ Dominio 'ejemplo.com' validado para la zona 'ejemplo.com'           │
│ $ Configurando protección para dominio: ejemplo.com                      │
│ $ [INFO] Configurando DNS: ejemplo.com -> 203.0.113.10 (A)              │
│ $ ✓ Registro DNS creado exitosamente con Proxy activado                 │
│ $ [INFO] Configurando modo SSL a Full (Strict)                          │
│ $ ✓ Modo SSL configurado a Full (Strict)                                │
│ $ [INFO] Activando 'Always Use HTTPS'                                   │
│ $ ✓ Redirección HTTPS forzada activada                                  │
│ $ [INFO] Optimizando configuraciones de Seguridad y DDoS...             │
│ $ ✓ WAF y protecciones DDoS base configuradas                           │
│ $ [INFO] Implementando Regla de Firewall Personalizada...               │
│ $ ✓ Regla de Firewall creada correctamente                              │
│ $ === PROVISIÓN COMPLETADA EXITOSAMENTE ===                             │
│ $ ✓ Protection setup completed for 1 domain(s)                          │
│ $ Next steps: Update nameservers at your domain registrar               │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Responsive Design - Vista Móvil

```
┌─────────────────────────────┐
│ SecurePerimeter    [≡]      │
├─────────────────────────────┤
│                             │
│ 🔍 Verificación DNS         │
│                             │
│ [Verificar Ahora]           │
│                             │
│ Verifica si ejemplo.com     │
│ fue delegado a Cloudflare   │
│                             │
│ ┌─────────────────────────┐ │
│ │ ⏳ DELEGACIÓN PENDIENTE │ │
│ │                         │ │
│ │ El dominio aún NO está  │ │
│ │ delegado a Cloudflare.  │ │
│ │                         │ │
│ │ [Acción requerida]      │ │
│ │                         │ │
│ │ 📋 Esperados:           │ │
│ │ ns1.cloudflare.com      │ │
│ │ ns2.cloudflare.com      │ │
│ │                         │ │
│ │ 🌐 Actuales:            │ │
│ │ ns1.registrador.com ✗   │ │
│ │ ns2.registrador.com ✗   │ │
│ │                         │ │
│ │ Última: 10:30:45        │ │
│ └─────────────────────────┘ │
│                             │
└─────────────────────────────┘
```

---

## Paleta de Colores

### Estado Exitoso ✅
- **Fondo:** `bg-green-900/20`
- **Borde:** `border-green-400`
- **Texto:** `text-green-200` / `text-green-300`
- **Icono:** `text-green-400`
- **Badge:** `bg-green-400/20 text-green-400 border-green-400`

### Estado Pendiente ⏳
- **Fondo:** `bg-yellow-900/20`
- **Borde:** `border-yellow-400`
- **Texto:** `text-yellow-200` / `text-yellow-300`
- **Icono:** `text-yellow-400`
- **Badge:** `bg-yellow-400/20 text-yellow-400 border-yellow-400`

### Estado Error ⚠️
- **Fondo:** `bg-orange-900/20`
- **Borde:** `border-orange-400`
- **Texto:** `text-orange-200` / `text-orange-300`
- **Icono:** `text-orange-400`

### Elementos Generales
- **Fondo Card:** `glass` (backdrop-blur con transparencia)
- **Texto Principal:** `text-white`
- **Texto Secundario:** `text-gray-400`
- **Código:** `font-mono text-gray-200 bg-black/30`

---

## Animaciones

### Entrada del Componente
```typescript
initial={{ opacity: 0, y: 20 }}
animate={{ opacity: 1, y: 0 }}
transition={{ delay: 0.3 }}
```

### Botón Hover
```typescript
whileHover={{ scale: 1.05 }}
whileTap={{ scale: 0.95 }}
```

### Resultado Aparece
```typescript
initial={{ opacity: 0, y: 10 }}
animate={{ opacity: 1, y: 0 }}
exit={{ opacity: 0, y: -10 }}
```

### Loading Spinner
```typescript
<Loader2 className="animate-spin" />
```

---

**Nota:** Estos mockups representan la implementación real del componente `DelegationChecker` integrado en `ProcessInfoPage`.
