# 🏗️ ARQUITECTURA DE INTEGRACIÓN STRIPE - CUBAN CAS

## 📋 ÍNDICE
1. [Visión Arquitectónica](#visión-arquitectónica)
2. [Configuración Stripe](#configuración-stripe)
3. [Flujo Completo de Monetización](#flujo-completo)
4. [Implementación Técnica](#implementación-técnica)
5. [Suspensión Automática](#suspensión-automática)
6. [Justificación Académica](#justificación-académica)

---

## 🎯 VISIÓN ARQUITECTÓNICA

### **Principios de Diseño:**

1. **Event-Driven Architecture (EDA)**
   - Stripe como fuente de verdad para eventos de facturación
   - Webhooks como mecanismo de sincronización asíncrona
   - Idempotencia garantizada en procesamiento de eventos

2. **Zero Trust Security**
   - Verificación de firma en todos los webhooks
   - Validación JWT en Edge Functions
   - RLS a nivel de base de datos

3. **Eventual Consistency**
   - Sincronización asíncrona entre Stripe y Supabase
   - Retry automático en fallos
   - Estado reconciliable

4. **Separation of Concerns**
   - Stripe: Procesamiento de pagos
   - Supabase: Estado de aplicación
   - Edge Functions: Orquestación

---

## 💳 CONFIGURACIÓN STRIPE

### **Estructura de Productos y Precios:**

```
PRODUCTOS EN STRIPE:
├── Cuban CAS - Basic
│   ├── Price: $29/mes (price_basic_monthly)
│   └── Price: $290/año (price_basic_yearly)
├── Cuban CAS - Pro
│   ├── Price: $99/mes (price_pro_monthly)
│   └── Price: $990/año (price_pro_yearly)
└── Cuban CAS - Enterprise
    ├── Price: $299/mes (price_enterprise_monthly)
    └── Price: $2990/año (price_enterprise_yearly)
```

### **Comandos de Configuración:**

```bash
# 1. Crear productos
stripe products create \
  --name="Cuban CAS - Basic" \
  --description="Essential cybersecurity for growing businesses"

stripe products create \
  --name="Cuban CAS - Pro" \
  --description="Professional security suite"

stripe products create \
  --name="Cuban CAS - Enterprise" \
  --description="Enterprise-grade security"

# 2. Crear precios mensuales
stripe prices create \
  --product=prod_basic_xxx \
  --unit-amount=2900 \
  --currency=usd \
  --recurring[interval]=month \
  --nickname="Basic Monthly"

stripe prices create \
  --product=prod_pro_xxx \
  --unit-amount=9900 \
  --currency=usd \
  --recurring[interval]=month \
  --nickname="Pro Monthly"

# 3. Crear precios anuales (con descuento)
stripe prices create \
  --product=prod_basic_xxx \
  --unit-amount=29000 \
  --currency=usd \
  --recurring[interval]=year \
  --nickname="Basic Yearly"

stripe prices create \
  --product=prod_pro_xxx \
  --unit-amount=99000 \
  --currency=usd \
  --recurring[interval]=year \
  --nickname="Pro Yearly"

# 4. Actualizar base de datos con Price IDs
# Ejecutar SQL después de obtener los IDs
```

### **Buenas Prácticas:**

1. **Entornos Separados:**
   - Test: `sk_test_xxx`, `pk_test_xxx`
   - Live: `sk_live_xxx`, `pk_live_xxx`
   - Nunca mezclar keys de test y live

2. **Metadata en Stripe:**
   ```json
   {
     "organization_id": "uuid",
     "plan_slug": "pro",
     "environment": "production"
   }
   ```

3. **Webhooks Separados:**
   - Test: `https://test.yourapp.com/webhooks/stripe`
   - Live: `https://yourapp.com/webhooks/stripe`

---

## 🔄 FLUJO COMPLETO DE MONETIZACIÓN

### **Diagrama de Flujo:**

```
┌─────────────────────────────────────────────────────────────┐
│                    1. SELECCIÓN DE PLAN                      │
│  Usuario en /pricing → Selecciona "Pro Monthly"             │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              2. CREAR CHECKOUT SESSION                       │
│  Frontend → POST /functions/v1/create-checkout               │
│  Body: { plan_slug: "pro", billing_cycle: "monthly" }       │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              3. EDGE FUNCTION PROCESSING                     │
│  • Validar JWT (auth.uid())                                  │
│  • Verificar rol = admin                                     │
│  • Obtener organization_id                                   │
│  • Buscar plan en DB                                         │
│  • Crear/obtener Stripe Customer                             │
│  • Crear Checkout Session                                    │
│  • Retornar checkout_url                                     │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              4. STRIPE CHECKOUT                              │
│  Usuario redirigido a Stripe Checkout                        │
│  • Ingresa datos de tarjeta                                  │
│  • Stripe procesa pago                                       │
│  • Crea subscription en Stripe                               │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              5. WEBHOOK: checkout.session.completed          │
│  Stripe → POST /functions/v1/stripe-webhook                  │
│  Event: checkout.session.completed                           │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              6. WEBHOOK PROCESSING                           │
│  • Verificar firma Stripe                                    │
│  • Extraer metadata (organization_id, plan_id)               │
│  • Obtener subscription de Stripe                            │
│  • UPSERT en tabla subscriptions                             │
│  • UPDATE organizations.status = 'active'                    │
│  • INSERT notification (bienvenida)                          │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              7. ACTIVACIÓN AUTOMÁTICA                        │
│  • RLS permite acceso a servicios                            │
│  • Usuario puede ejecutar scans                              │
│  • Límites del plan aplicados                                │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              8. USO DEL SISTEMA                              │
│  Usuario ejecuta servicios dentro de límites                 │
│  • Scans automáticos                                         │
│  • Generación de reportes                                    │
│  • Monitoreo continuo                                        │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              9. RENOVACIÓN AUTOMÁTICA                        │
│  Stripe intenta cobrar al final del período                  │
│  ├─ ÉXITO → Webhook: invoice.payment_succeeded              │
│  │   └─ Extender current_period_end                         │
│  └─ FALLO → Webhook: invoice.payment_failed                 │
│      └─ Suspender organización                              │
└─────────────────────────────────────────────────────────────┘
```

### **Estados de Suscripción:**

```typescript
type SubscriptionStatus = 
  | 'trialing'      // Período de prueba activo
  | 'active'        // Suscripción activa y pagada
  | 'past_due'      // Pago fallido, en período de gracia
  | 'canceled'      // Cancelada por usuario
  | 'unpaid'        // Múltiples fallos de pago
  | 'incomplete'    // Pago inicial no completado
```

### **Mapeo a Estado de Organización:**

```typescript
const mapSubscriptionToOrgStatus = (subStatus: string): string => {
  switch (subStatus) {
    case 'trialing':
    case 'active':
      return 'active'
    
    case 'past_due':
      return 'suspended' // Período de gracia
    
    case 'canceled':
    case 'unpaid':
    case 'incomplete':
      return 'suspended'
    
    default:
      return 'suspended'
  }
}
```

---

## 💻 IMPLEMENTACIÓN TÉCNICA

Ver archivos:
- `supabase/functions/create-checkout/index.ts` (ya creado)
- `supabase/functions/stripe-webhook/index.ts` (ya creado)
- `supabase/functions/check-subscriptions/index.ts` (ya creado)

### **Mejoras Adicionales Recomendadas:**

#### **1. Retry Logic con Exponential Backoff:**

```typescript
// supabase/functions/_shared/retry-helper.ts
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      
      if (attempt < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, attempt)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }
  
  throw lastError
}
```

#### **2. Idempotency Key Management:**

```typescript
// En stripe-webhook
const idempotencyKey = `webhook_${event.id}_${event.type}`

// Verificar si ya procesamos este evento
const { data: existing } = await supabase
  .from('webhook_events')
  .select('id')
  .eq('stripe_event_id', event.id)
  .single()

if (existing) {
  console.log('Event already processed:', event.id)
  return new Response(JSON.stringify({ received: true }), { status: 200 })
}

// Registrar evento
await supabase
  .from('webhook_events')
  .insert({
    stripe_event_id: event.id,
    event_type: event.type,
    processed_at: new Date().toISOString(),
    payload: event
  })
```

#### **3. Dead Letter Queue para Fallos:**

```typescript
// Tabla para eventos fallidos
CREATE TABLE webhook_failures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  payload JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_retry_at TIMESTAMP WITH TIME ZONE
);

// En webhook handler
catch (error) {
  await supabase
    .from('webhook_failures')
    .insert({
      stripe_event_id: event.id,
      event_type: event.type,
      error_message: error.message,
      payload: event
    })
  
  // Alertar equipo
  await sendAlert('Webhook processing failed', error)
}
```

---

## 🚫 SUSPENSIÓN AUTOMÁTICA

### **Estrategia Multi-Capa:**

#### **Capa 1: RLS (Row Level Security)**

```sql
-- Política para bloquear acceso a servicios si organización suspendida
CREATE POLICY "Active organizations only" ON service_executions
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT id FROM organizations 
      WHERE status = 'active'
    )
  );

CREATE POLICY "Active organizations only" ON domains
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT id FROM organizations 
      WHERE status = 'active'
    )
  );

CREATE POLICY "Active organizations only" ON reports
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT id FROM organizations 
      WHERE status = 'active'
    )
  );
```

#### **Capa 2: Edge Function Middleware**

```typescript
// supabase/functions/_shared/subscription-guard.ts
export async function requireActiveSubscription(
  context: AuthContext
): Promise<{ allowed: boolean; error: Response | null }> {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  // Verificar estado de organización
  const { data: org } = await supabase
    .from('organizations')
    .select('status')
    .eq('id', context.organization.id)
    .single()

  if (!org || org.status !== 'active') {
    return {
      allowed: false,
      error: new Response(
        JSON.stringify({
          error: 'Subscription required',
          message: 'Your organization subscription is not active. Please update your payment method.',
          status: org?.status || 'unknown',
          action_required: 'update_payment'
        }),
        { 
          status: 402, // Payment Required
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }
  }

  // Verificar suscripción activa
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('status, current_period_end')
    .eq('organization_id', context.organization.id)
    .in('status', ['active', 'trialing'])
    .single()

  if (!sub) {
    return {
      allowed: false,
      error: new Response(
        JSON.stringify({
          error: 'No active subscription',
          message: 'Please subscribe to a plan to use this service.',
          action_required: 'subscribe'
        }),
        { status: 402, headers: { 'Content-Type': 'application/json' } }
      )
    }
  }

  // Verificar que no esté expirada
  if (new Date(sub.current_period_end) < new Date()) {
    return {
      allowed: false,
      error: new Response(
        JSON.stringify({
          error: 'Subscription expired',
          message: 'Your subscription has expired. Please renew to continue.',
          expired_at: sub.current_period_end,
          action_required: 'renew'
        }),
        { status: 402, headers: { 'Content-Type': 'application/json' } }
      )
    }
  }

  return { allowed: true, error: null }
}
```

#### **Capa 3: Frontend Guard**

```typescript
// src/hooks/useSubscriptionGuard.ts
export function useSubscriptionGuard() {
  const { organization, subscription } = useAuth()
  const navigate = useNavigate()

  const checkSubscription = useCallback(() => {
    // Verificar estado de organización
    if (organization?.status !== 'active') {
      navigate('/billing/suspended')
      return false
    }

    // Verificar suscripción activa
    if (!subscription || !['active', 'trialing'].includes(subscription.status)) {
      navigate('/billing/subscribe')
      return false
    }

    // Verificar período no expirado
    if (new Date(subscription.current_period_end) < new Date()) {
      navigate('/billing/expired')
      return false
    }

    return true
  }, [organization, subscription, navigate])

  return { checkSubscription, isActive: organization?.status === 'active' }
}

// Uso en componentes
function ScanExecutionPage() {
  const { checkSubscription } = useSubscriptionGuard()

  const handleExecuteScan = async () => {
    if (!checkSubscription()) return
    
    // Ejecutar scan
    await executeScan()
  }

  return <button onClick={handleExecuteScan}>Execute Scan</button>
}
```

### **Flujo de Suspensión:**

```
EVENTO: invoice.payment_failed
  ↓
Webhook Handler:
  ├─ UPDATE subscriptions SET status = 'past_due'
  ├─ UPDATE organizations SET status = 'suspended'
  ├─ INSERT notification (payment_failed)
  └─ Enviar email de alerta
  ↓
RLS Policies:
  └─ Bloquean INSERT en service_executions, domains, reports
  ↓
Edge Functions:
  └─ requireActiveSubscription() retorna 402
  ↓
Frontend:
  └─ Redirige a /billing/update-payment
  ↓
Usuario actualiza método de pago en Stripe Customer Portal
  ↓
EVENTO: invoice.payment_succeeded
  ↓
Webhook Handler:
  ├─ UPDATE subscriptions SET status = 'active'
  ├─ UPDATE organizations SET status = 'active'
  └─ INSERT notification (payment_succeeded)
  ↓
Servicios reactivados automáticamente
```

---

## 🎓 JUSTIFICACIÓN ACADÉMICA

### **1. Arquitectura Orientada a Eventos (EDA)**

**Definición:**
> "Event-Driven Architecture es un patrón arquitectónico que promueve la producción, detección, consumo y reacción a eventos" (Fowler, 2017)

**Aplicación en Cuban CAS:**
- **Productor de Eventos**: Stripe (checkout.session.completed, invoice.payment_failed)
- **Consumidor de Eventos**: Edge Function stripe-webhook
- **Reacción**: Actualización de estado en Supabase, notificaciones, suspensión

**Ventajas:**
- ✅ **Desacoplamiento**: Stripe y Supabase operan independientemente
- ✅ **Escalabilidad**: Procesamiento asíncrono de eventos
- ✅ **Resiliencia**: Retry automático en fallos
- ✅ **Auditabilidad**: Cada evento queda registrado

### **2. Eventual Consistency**

**Definición:**
> "En sistemas distribuidos, la consistencia eventual garantiza que, en ausencia de nuevas actualizaciones, todas las réplicas convergerán al mismo estado" (Vogels, 2009)

**Aplicación:**
- Estado en Stripe (fuente de verdad)
- Estado en Supabase (réplica eventual)
- Sincronización vía webhooks
- Reconciliación en caso de desincronización

**Trade-offs Aceptados:**
- ❌ Latencia de sincronización (1-5 segundos)
- ✅ Alta disponibilidad
- ✅ Tolerancia a particiones de red

### **3. Zero Trust Security**

**Principios Aplicados:**
1. **Verificar Explícitamente**: Firma de webhook verificada
2. **Privilegio Mínimo**: RLS por organización
3. **Asumir Compromiso**: Validación en múltiples capas

**Implementación:**
- Verificación de firma Stripe (HMAC SHA256)
- JWT validation en Edge Functions
- RLS a nivel de base de datos
- Audit logging completo

### **4. Separation of Concerns**

**Responsabilidades Claras:**
- **Stripe**: Procesamiento de pagos, gestión de suscripciones
- **Supabase**: Estado de aplicación, lógica de negocio
- **Edge Functions**: Orquestación, transformación de datos
- **Frontend**: Presentación, experiencia de usuario

### **5. Idempotencia**

**Definición:**
> "Una operación es idempotente si ejecutarla múltiples veces produce el mismo resultado que ejecutarla una vez" (Richardson, 2018)

**Implementación:**
- Tabla `webhook_events` con `stripe_event_id` único
- Verificación antes de procesar
- UPSERT en lugar de INSERT
- Retry seguro sin duplicación

---

## 📊 MÉTRICAS Y MONITOREO

### **KPIs Técnicos:**

1. **Webhook Processing Time**
   - Target: < 500ms p95
   - Alert: > 2s p99

2. **Webhook Success Rate**
   - Target: > 99.9%
   - Alert: < 99%

3. **Subscription Sync Latency**
   - Target: < 5s
   - Alert: > 30s

4. **Payment Failure Rate**
   - Target: < 5%
   - Alert: > 10%

### **Queries de Monitoreo:**

```sql
-- Webhook processing stats
SELECT 
  event_type,
  COUNT(*) as total,
  AVG(EXTRACT(EPOCH FROM (processed_at - created_at))) as avg_latency_seconds,
  COUNT(*) FILTER (WHERE error_message IS NOT NULL) as failures
FROM webhook_events
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY event_type;

-- Subscription health
SELECT 
  status,
  COUNT(*) as count,
  COUNT(*) * 100.0 / SUM(COUNT(*)) OVER () as percentage
FROM subscriptions
GROUP BY status;

-- Revenue metrics (MRR)
SELECT 
  DATE_TRUNC('month', s.created_at) as month,
  SUM(CASE 
    WHEN s.billing_cycle = 'monthly' THEN p.price_monthly
    WHEN s.billing_cycle = 'yearly' THEN p.price_yearly / 12
  END) as mrr
FROM subscriptions s
JOIN plans p ON s.plan_id = p.id
WHERE s.status IN ('active', 'trialing')
GROUP BY month
ORDER BY month DESC;
```

---

## 🚀 ESCALABILIDAD FUTURA

### **Fase 1: Actual (MVP)**
- Webhooks síncronos
- Procesamiento directo
- Sin cola

### **Fase 2: Escala Media (1000+ orgs)**
- Introducir cola de mensajes (AWS SQS / Google Pub/Sub)
- Worker dedicado para webhooks
- Retry automático con backoff

### **Fase 3: Escala Alta (10,000+ orgs)**
- Event sourcing completo
- CQRS pattern
- Read replicas
- Caching layer (Redis)

### **Arquitectura Futura:**

```
Stripe Webhook
  ↓
API Gateway
  ↓
Message Queue (SQS)
  ↓
Worker Pool (Lambda/Cloud Run)
  ├─ Worker 1: Process checkout events
  ├─ Worker 2: Process payment events
  └─ Worker 3: Process subscription events
  ↓
Event Store (PostgreSQL)
  ↓
Materialized Views (Read Models)
```

---

**🎉 ARQUITECTURA COMPLETA Y LISTA PARA TESIS!**