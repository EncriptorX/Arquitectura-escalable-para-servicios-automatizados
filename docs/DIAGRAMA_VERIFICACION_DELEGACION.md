# Diagrama de Flujo - Verificación de Delegación DNS

## Flujo Completo del Sistema

```
┌─────────────────────────────────────────────────────────────────────┐
│                    CLIENTE SOLICITA PROTECCIÓN                       │
│                                                                       │
│  Cliente envía dominio → Sistema configura Cloudflare                │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│              SISTEMA MUESTRA INSTRUCCIONES DE DELEGACIÓN             │
│                                                                       │
│  📋 Nameservers de Cloudflare:                                       │
│     • ns1.cloudflare.com                                             │
│     • ns2.cloudflare.com                                             │
│                                                                       │
│  📝 Pasos detallados (1-6)                                           │
│                                                                       │
│  🔍 Componente de Verificación (DelegationChecker)                   │
│     [Botón: Verificar Ahora]                                         │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│           CLIENTE ACTUALIZA NAMESERVERS EN REGISTRADOR               │
│                                                                       │
│  Cliente va a GoDaddy/Namecheap/etc.                                 │
│  → Cambia nameservers a los de Cloudflare                            │
│  → Guarda cambios                                                    │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│              CLIENTE HACE CLIC EN "VERIFICAR AHORA"                  │
│                                                                       │
│  Frontend: DelegationChecker.tsx                                     │
│  → Llama a POST /api/verificar-delegacion                            │
│  → Envía: { "dominio": "ejemplo.com" }                               │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    BACKEND VERIFICA DELEGACIÓN                       │
│                                                                       │
│  api/verificar-delegacion.py                                         │
│                                                                       │
│  1️⃣ Obtener nameservers actuales del dominio                         │
│     → DNS lookup: ejemplo.com NS records                             │
│     → Resultado: [ns1.registrador.com, ns2.registrador.com]         │
│                                                                       │
│  2️⃣ Obtener nameservers de Cloudflare                                │
│     → API: GET /zones/{zone_id}                                      │
│     → Resultado: [ns1.cloudflare.com, ns2.cloudflare.com]           │
│                                                                       │
│  3️⃣ Comparar nameservers                                             │
│     → ¿Coinciden todos los NS de Cloudflare?                         │
│     → delegado = true/false                                          │
│     → puede_continuar = true/false                                   │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
                    ┌────────┴────────┐
                    │                 │
         ┌──────────▼─────────┐  ┌───▼──────────────┐
         │  DELEGADO = TRUE   │  │ DELEGADO = FALSE │
         │  ✅ Exitoso        │  │ ⏳ Pendiente     │
         └──────────┬─────────┘  └───┬──────────────┘
                    │                 │
                    ▼                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                  FRONTEND MUESTRA RESULTADO VISUAL                   │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │ ✅ DELEGACIÓN EXITOSA                                            ││
│  │                                                                   ││
│  │ El dominio 'ejemplo.com' está correctamente delegado a           ││
│  │ Cloudflare. El sistema puede continuar con la provisión de       ││
│  │ seguridad.                                                        ││
│  │                                                                   ││
│  │ [Badge: Sistema puede continuar]                                 ││
│  │                                                                   ││
│  │ Nameservers Esperados    │    Nameservers Actuales               ││
│  │ ─────────────────────────┼───────────────────────────            ││
│  │ ns1.cloudflare.com       │    ns1.cloudflare.com ✓               ││
│  │ ns2.cloudflare.com       │    ns2.cloudflare.com ✓               ││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                       │
│  O                                                                    │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │ ⏳ DELEGACIÓN PENDIENTE                                          ││
│  │                                                                   ││
│  │ El dominio 'ejemplo.com' aún NO está delegado a Cloudflare.     ││
│  │ Por favor actualiza los nameservers y espera propagación DNS.    ││
│  │                                                                   ││
│  │ [Badge: Acción requerida]                                        ││
│  │                                                                   ││
│  │ Nameservers Esperados    │    Nameservers Actuales               ││
│  │ ─────────────────────────┼───────────────────────────            ││
│  │ ns1.cloudflare.com       │    ns1.registrador.com ✗              ││
│  │ ns2.cloudflare.com       │    ns2.registrador.com ✗              ││
│  └─────────────────────────────────────────────────────────────────┘│
└───────────────────────────────────────────────────────────────────────┘
```

## Arquitectura de Componentes

```
┌─────────────────────────────────────────────────────────────────────┐
│                           FRONTEND                                    │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ ProcessInfoPage.tsx                                          │    │
│  │                                                               │    │
│  │  • Muestra instrucciones de delegación                       │    │
│  │  • Muestra nameservers de Cloudflare                         │    │
│  │  • Renderiza DelegationChecker                               │    │
│  │                                                               │    │
│  │  ┌────────────────────────────────────────────────────────┐  │    │
│  │  │ DelegationChecker.tsx                                   │  │    │
│  │  │                                                          │  │    │
│  │  │  • Botón "Verificar Ahora"                              │  │    │
│  │  │  • Llama a /api/verificar-delegacion                    │  │    │
│  │  │  • Muestra resultado visual                             │  │    │
│  │  │  • Comparación de nameservers                           │  │    │
│  │  │  • Indicadores por color                                │  │    │
│  │  └────────────────────────────────────────────────────────┘  │    │
│  └─────────────────────────────────────────────────────────────┘    │
└───────────────────────────────┬───────────────────────────────────────┘
                                │
                                │ HTTP POST
                                │ { "dominio": "ejemplo.com" }
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                           BACKEND                                     │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ api/verificar-delegacion.py                                  │    │
│  │                                                               │    │
│  │  ┌──────────────────────────────────────────────────────┐   │    │
│  │  │ obtener_nameservers_actuales(dominio)                │   │    │
│  │  │  • DNS lookup usando dnspython                        │   │    │
│  │  │  • Consulta NS records                                │   │    │
│  │  │  • Retorna lista de nameservers                       │   │    │
│  │  └──────────────────────────────────────────────────────┘   │    │
│  │                                                               │    │
│  │  ┌──────────────────────────────────────────────────────┐   │    │
│  │  │ obtener_nameservers_cloudflare(zone_id, token)       │   │    │
│  │  │  • Llama a Cloudflare API                            │   │    │
│  │  │  • GET /zones/{zone_id}                              │   │    │
│  │  │  • Extrae name_servers del resultado                 │   │    │
│  │  └──────────────────────────────────────────────────────┘   │    │
│  │                                                               │    │
│  │  ┌──────────────────────────────────────────────────────┐   │    │
│  │  │ verificar_delegacion(ns_actual, ns_cf)               │   │    │
│  │  │  • Normaliza nameservers (lowercase, sin punto)      │   │    │
│  │  │  • Compara si todos los NS de CF están presentes     │   │    │
│  │  │  • Retorna true/false                                │   │    │
│  │  └──────────────────────────────────────────────────────┘   │    │
│  └─────────────────────────────────────────────────────────────┘    │
└───────────────────────────────┬───────────────────────────────────────┘
                                │
                                │ JSON Response
                                │ { "delegado": true, "puede_continuar": true }
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    SERVICIOS EXTERNOS                                 │
│                                                                       │
│  ┌──────────────────────┐         ┌──────────────────────┐          │
│  │   DNS Servers        │         │   Cloudflare API     │          │
│  │                      │         │                      │          │
│  │  • Resuelve NS       │         │  • GET /zones/{id}   │          │
│  │    records           │         │  • Retorna zone info │          │
│  │  • Retorna           │         │  • Incluye           │          │
│  │    nameservers       │         │    nameservers       │          │
│  └──────────────────────┘         └──────────────────────┘          │
└─────────────────────────────────────────────────────────────────────┘
```

## Estados del Sistema

```
┌─────────────────────────────────────────────────────────────────────┐
│                         ESTADOS POSIBLES                              │
└─────────────────────────────────────────────────────────────────────┘

1️⃣ DELEGACIÓN EXITOSA ✅
   ┌────────────────────────────────────────────────────────────────┐
   │ delegado: true                                                  │
   │ puede_continuar: true                                           │
   │ nameservers_actuales: [ns1.cloudflare.com, ns2.cloudflare.com] │
   │ mensaje: "✅ Delegación exitosa, sistema puede continuar"      │
   └────────────────────────────────────────────────────────────────┘
   
   Acción: Sistema puede proceder con provisión de seguridad

2️⃣ DELEGACIÓN PENDIENTE ⏳
   ┌────────────────────────────────────────────────────────────────┐
   │ delegado: false                                                 │
   │ puede_continuar: false                                          │
   │ nameservers_actuales: [ns1.registrador.com, ...]               │
   │ mensaje: "⏳ Delegación pendiente, actualiza nameservers"      │
   └────────────────────────────────────────────────────────────────┘
   
   Acción: Cliente debe actualizar nameservers y esperar propagación

3️⃣ NO SE PUDO VERIFICAR ⚠️
   ┌────────────────────────────────────────────────────────────────┐
   │ delegado: null                                                  │
   │ puede_continuar: false                                          │
   │ nameservers_actuales: null                                      │
   │ error: "No se pudo verificar nameservers actuales"             │
   │ mensaje: "⚠️ Verifica manualmente"                            │
   └────────────────────────────────────────────────────────────────┘
   
   Acción: Cliente verifica manualmente comparando nameservers

4️⃣ ERROR DE CONFIGURACIÓN ❌
   ┌────────────────────────────────────────────────────────────────┐
   │ status: "error"                                                 │
   │ delegado: false                                                 │
   │ puede_continuar: false                                          │
   │ mensaje: "Cloudflare no está configurado"                      │
   └────────────────────────────────────────────────────────────────┘
   
   Acción: Administrador debe configurar CF_API_TOKEN y CF_ZONE_ID
```

## Cronología de Propagación DNS

```
Tiempo →

0 min     Cliente actualiza nameservers en registrador
│         [Verificación: ⏳ Pendiente]
│
│
15 min    Algunos DNS servers empiezan a ver el cambio
│         [Verificación: ⏳ Pendiente o ✅ Exitosa]
│
│
1 hora    Mayoría de DNS servers tienen el cambio
│         [Verificación: ✅ Exitosa (probable)]
│
│
2 horas   Propagación casi completa
│         [Verificación: ✅ Exitosa (muy probable)]
│
│
24 horas  Propagación completa en casi todos los casos
│         [Verificación: ✅ Exitosa (garantizado)]
│
│
48 horas  Propagación completa garantizada
│         [Verificación: ✅ Exitosa (100%)]
```

## Interacción Usuario-Sistema

```
┌─────────────────────────────────────────────────────────────────────┐
│                      LÍNEA DE TIEMPO                                  │
└─────────────────────────────────────────────────────────────────────┘

T+0 min   │ Cliente solicita protección
          │ Sistema configura Cloudflare
          │ Sistema muestra instrucciones + DelegationChecker
          │
T+5 min   │ Cliente actualiza nameservers en registrador
          │ Cliente hace clic en "Verificar Ahora"
          │ Sistema: ⏳ "Delegación pendiente"
          │
T+30 min  │ Cliente hace clic en "Verificar Ahora" nuevamente
          │ Sistema: ⏳ "Delegación pendiente" (aún propagando)
          │
T+1 hora  │ Cliente hace clic en "Verificar Ahora"
          │ Sistema: ✅ "Delegación exitosa, sistema puede continuar"
          │
T+1h 5min │ Sistema procede automáticamente con provisión de seguridad
          │ Protección perimetral activada
```

---

**Nota:** Este diagrama muestra el flujo completo de verificación de delegación DNS implementado en el sistema.
