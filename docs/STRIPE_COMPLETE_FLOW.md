# 🔄 FLUJO COMPLETO DE MONETIZACIÓN STRIPE - CUBAN CAS

## 📊 DIAGRAMA DE FLUJO DETALLADO

```
┌─────────────────────────────────────────────────────────────────────┐
│                    FASE 1: SELECCIÓN DE PLAN                         │
│                                                                       │
│  Usuario navega a /pricing                                           │
│    ↓                                                                  │
│  Frontend carga planes desde Supabase                                │
│    SELECT * FROM plans WHERE active = true                           │
│    ↓                                                                  │
│  Usuario selecciona "Pro Monthly" ($99/mes)                          │
│    ↓                                                                  │
│  Click en "Subscribe Now"                                            │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                FASE 2: CREAR CHECKOUT SESSION                        │
│                                                                       │
│  Frontend → POST /functions/v1/create-checkout                       │
│  Headers:                                                            │
│    Authorization: Bearer <JWT_TOKEN>                                 │
│  Body:                                                               │
│    {                                                                 │
│      "plan_slug": "pro",                                             │
│      "billing_cycle": "monthly",                                     │
│      "success_url": "https://app.com/dashboard?checkout=success",   │
│      "cancel_url": "https://app.com/pricing?checkout=cancelled"     │
│    }                                                                 │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│              FASE 3: EDGE FUNCTION PROCESSING                        │
│                                                                       │
│  Edge Function: create-checkout                                      │
│    ↓                                                                  │
│  1. Validar JWT con Supabase Auth                                    │
│     const { data: { user } } = await supabase.auth.getUser(token)   │
│    ↓                                                                  │
│  2. Obtener contexto de organización                                 │
│     SELECT * FROM organization_members                               │
│     WHERE user_id = auth.uid() AND role = 'admin'                    │
│    ↓                                                                  │
│  3. Verificar que usuario sea admin                                  │
│     if (context.role !== 'admin') return 403                         │
│    ↓                                                                  │
│  4. Buscar plan en base de datos                                     │
│     SELECT * FROM plans WHERE slug = 'pro' AND active = true         │
│    ↓                                                                  │
│  5. Obtener Stripe Price ID                                          │
│     price_id = plan.stripe_price_id_monthly                          │
│    ↓                                                                  │
│  6. Crear/Obtener Stripe Customer                                    │
│     if (!org.stripe_customer_id) {                                   │
│       customer = await stripe.customers.create({                     │
│         email: org.billing_email,                                    │
│         name: org.name,                                              │
│         metadata: { organization_id: org.id }                        │
│       })                                                             │
│       UPDATE organizations SET stripe_customer_id = customer.id      │
│     }                                                                 │
│    ↓                                                                  │
│  7. Crear Stripe Checkout Session                                    │
│     session = await stripe.checkout.sessions.create({                │
│       customer: stripe_customer_id,                                  │
│       mode: 'subscription',                                          │
│       line_items: [{ price: price_id, quantity: 1 }],               │
│       success_url: success_url,                                      │
│       cancel_url: cancel_url,                                        │
│       metadata: {                                                    │
│         organization_id: org.id,                                     │
│         plan_id: plan.id,                                            │
│         plan_slug: 'pro',                                            │
│         billing_cycle: 'monthly'                                     │
│       },                                                             │
│       subscription_data: {                                           │
│         trial_period_days: 14,                                       │
│         metadata: { organization_id: org.id }                        │
│       }                                                              │
│     })                                                               │
│    ↓                                                                  │
│  8. Retornar checkout URL                                            │
│     return { checkout_url: session.url, session_id: session.id }    │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                  FASE 4: STRIPE CHECKOUT                             │
│                                                                       │
│  Usuario redirigido a Stripe Checkout                                │
│    URL: https://checkout.stripe.com/c/pay/cs_test_xxx               │
│    ↓                                                                  │
│  Usuario ingresa información de pago                                 │
│    • Número de tarjeta                                               │
│    • Fecha de expiración                                             │
│    • CVC                                                             │
│    • Dirección de facturación                                        │
│    ↓                                                                  │
│  Stripe valida y procesa el pago                                     │
│    • Verificación 3D Secure (si aplica)                              │
│    • Validación de fondos                                            │
│    • Creación de subscription                                        │
│    ↓                                                                  │
│  Pago exitoso                                                        │
│    ↓                                                                  │
│  Stripe crea subscription                                            │
│    subscription_id: sub_xxx                                          │
│    status: 'trialing' (14 días)                                      │
│    current_period_start: 2026-02-27                                  │
│    current_period_end: 2026-03-13                                    │
│    trial_end: 2026-03-13                                             │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│              FASE 5: WEBHOOK checkout.session.completed              │
│                                                                       │
│  Stripe → POST /functions/v1/stripe-webhook                          │
│  Headers:                                                            │
│    stripe-signature: t=xxx,v1=yyy                                    │
│  Body:                                                               │
│    {                                                                 │
│      "id": "evt_xxx",                                                │
│      "type": "checkout.session.completed",                           │
│      "data": {                                                       │
│        "object": {                                                   │
│          "id": "cs_test_xxx",                                        │
│          "subscription": "sub_xxx",                                  │
│          "customer": "cus_xxx",                                      │
│          "metadata": {                                               │
│            "organization_id": "uuid",                                │
│            "plan_id": "uuid",                                        │
│            "plan_slug": "pro",                                       │
│            "billing_cycle": "monthly"                                │
│          }                                                           │
│        }                                                             │
│      }                                                               │
│    }                                                                 │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│              FASE 6: WEBHOOK PROCESSING                              │
│                                                                       │
│  Edge Function: stripe-webhook                                       │
│    ↓                                                                  │
│  1. Verificar firma del webhook                                      │
│     const event = stripe.webhooks.constructEvent(                    │
│       body,                                                          │
│       signature,                                                     │
│       webhookSecret                                                  │
│     )                                                                 │
│     ↓                                                                  │
│  2. Verificar idempotencia                                           │
│     SELECT * FROM webhook_events WHERE stripe_event_id = evt_xxx     │
│     if (exists) return 200 // Ya procesado                           │
│     ↓                                                                  │
│  3. Registrar evento                                                 │
│     INSERT INTO webhook_events (stripe_event_id, event_type, ...)   │
│     ↓                                                                  │
│  4. Extraer metadata                                                 │
│     organization_id = session.metadata.organization_id               │
│     plan_id = session.metadata.plan_id                               │
│     ↓                                                                  │
│  5. Obtener subscription completa de Stripe                          │
│     subscription = await stripe.subscriptions.retrieve(sub_xxx)      │
│     ↓                                                                  │
│  6. UPSERT en tabla subscriptions                                    │
│     INSERT INTO subscriptions (                                      │
│       organization_id,                                               │
│       plan_id,                                                       │
│       status,                                                        │
│       billing_cycle,                                                 │
│       stripe_subscription_id,                                        │
│       stripe_customer_id,                                            │
│       current_period_start,                                          │
│       current_period_end,                                            │
│       trial_end                                                      │
│     ) VALUES (...)                                                   │
│     ON CONFLICT (stripe_subscription_id) DO UPDATE                   │
│     ↓                                                                  │
│  7. Actualizar estado de organización                                │
│     UPDATE organizations                                             │
│     SET status = 'active', stripe_customer_id = cus_xxx              │
│     WHERE id = organization_id                                       │
│     ↓                                                                  │
│  8. Crear notificación de bienvenida                                 │
│     INSERT INTO notifications (                                      │
│       organization_id,                                               │
│       subject: 'Welcome to Cuban CAS Pro!',                          │
│       body: 'Your subscription is now active...',                    │
│       type: 'success',                                               │
│       category: 'billing'                                            │
│     )                                                                 │
│     ↓                                                                  │
│  9. Enviar email de confirmación (opcional)                          │
│     await sendEmail(org.billing_email, 'subscription_activated')     │
│     ↓                                                                  │
│  10. Retornar 200 OK a Stripe                                        │
│      return { received: true }                                       │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│              FASE 7: ACTIVACIÓN AUTOMÁTICA                           │
│                                                                       │
│  RLS Policies permiten acceso                                        │
│    • organization.status = 'active' ✅                               │
│    • subscription.status = 'trialing' ✅                             │
│    ↓                                                                  │
│  Usuario redirigido a /dashboard?checkout=success                    │
│    ↓                                                                  │
│  Frontend detecta parámetro checkout=success                         │
│    • Muestra mensaje de éxito                                        │
│    • Recarga datos de suscripción                                    │
│    • Habilita features del plan Pro                                  │
│    ↓                                                                  │
│  Usuario puede ahora:                                                │
│    • Crear hasta 25 dominios                                         │
│    • Ejecutar 200 scans/mes                                          │
│    • Generar 50 reportes/mes                                         │
│    • Usar AI reports                                                 │
│    • Acceder a soporte prioritario                                   │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                  FASE 8: USO DEL SISTEMA                             │
│                                                                       │
│  Usuario ejecuta scan                                                │
│    ↓                                                                  │
│  Frontend → POST /functions/v1/execute-scan                          │
│    ↓                                                                  │
│  Edge Function valida:                                               │
│    1. JWT válido ✅                                                  │
│    2. Organization activa ✅                                         │
│    3. Subscription activa ✅                                         │
│    4. Límites no excedidos ✅                                        │
│       SELECT check_plan_limit('scan', 1)                             │
│       → allowed: true, remaining: 197                                │
│    ↓                                                                  │
│  Ejecutar scan                                                       │
│    INSERT INTO service_executions (...)                              │
│    ↓                                                                  │
│  Trigger automático registra uso                                     │
│    INSERT INTO usage_records (                                       │
│      organization_id,                                                │
│      resource_type: 'scan',                                          │
│      quantity: 1                                                     │
│    )                                                                 │
│    ↓                                                                  │
│  Scan completado exitosamente                                        │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│              FASE 9: FIN DE TRIAL (Día 14)                           │
│                                                                       │
│  Stripe intenta cobrar primer pago                                   │
│    ↓                                                                  │
│  ┌─────────────────────────────────────────────────────┐            │
│  │ ESCENARIO A: PAGO EXITOSO                           │            │
│  │                                                      │            │
│  │ Stripe cobra $99                                     │            │
│  │   ↓                                                  │            │
│  │ Webhook: invoice.payment_succeeded                   │            │
│  │   ↓                                                  │            │
│  │ UPDATE subscriptions                                 │            │
│  │ SET status = 'active',                               │            │
│  │     current_period_end = NOW() + INTERVAL '1 month' │            │
│  │   ↓                                                  │            │
│  │ INSERT INTO invoices (                               │            │
│  │   amount_paid: 9900,                                 │            │
│  │   status: 'paid'                                     │            │
│  │ )                                                    │            │
│  │   ↓                                                  │            │
│  │ Servicio continúa sin interrupción                   │            │
│  └─────────────────────────────────────────────────────┘            │
│                                                                       │
│  ┌─────────────────────────────────────────────────────┐            │
│  │ ESCENARIO B: PAGO FALLIDO                           │            │
│  │                                                      │            │
│  │ Stripe intenta cobrar → FALLA                       │            │
│  │   ↓                                                  │            │
│  │ Webhook: invoice.payment_failed                      │            │
│  │   ↓                                                  │            │
│  │ UPDATE subscriptions SET status = 'past_due'         │            │
│  │   ↓                                                  │            │
│  │ UPDATE organizations SET status = 'suspended'        │            │
│  │   ↓                                                  │            │
│  │ INSERT INTO notifications (                          │            │
│  │   type: 'error',                                     │            │
│  │   subject: 'Payment Failed'                          │            │
│  │ )                                                    │            │
│  │   ↓                                                  │            │
│  │ Enviar email urgente                                 │            │
│  │   ↓                                                  │            │
│  │ RLS bloquea acceso a servicios                       │            │
│  │   ↓                                                  │            │
│  │ Frontend muestra: "Payment Required"                 │            │
│  │   ↓                                                  │            │
│  │ Usuario actualiza método de pago                     │            │
│  │   ↓                                                  │            │
│  │ Stripe reintenta cobro → ÉXITO                      │            │
│  │   ↓                                                  │            │
│  │ Webhook: invoice.payment_succeeded                   │            │
│  │   ↓                                                  │            │
│  │ Servicios reactivados automáticamente                │            │
│  └─────────────────────────────────────────────────────┘            │
└───────────────────────────────────────────────────────────────────┘
```

---

## 🔒 SEGURIDAD EN CADA CAPA

### **Capa 1: Verificación de Firma Webhook**
```typescript
const signature = req.headers.get('stripe-signature')
const event = stripe.webhooks.constructEvent(
  body,
  signature,
  webhookSecret
)
// Si la firma no coincide, Stripe lanza error
```

### **Capa 2: Idempotencia**
```typescript
const { data: existing } = await supabase
  .from('webhook_events')
  .select('id')
  .eq('stripe_event_id', event.id)
  .single()

if (existing) {
  return new Response(JSON.stringify({ received: true }), { status: 200 })
}
```

### **Capa 3: RLS (Row Level Security)**
```sql
CREATE POLICY "Active organizations only" ON service_executions
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT id FROM organizations WHERE status = 'active'
    )
  );
```

### **Capa 4: Edge Function Middleware**
```typescript
const { allowed, error } = await requireActiveSubscription(context)
if (!allowed) return error
```

### **Capa 5: Frontend Guard**
```typescript
const { checkSubscription } = useSubscriptionGuard()
if (!checkSubscription()) return
```

---

## 📈 MEJORES PRÁCTICAS IMPLEMENTADAS

### **1. Retry con Exponential Backoff**
```typescript
async function retryWithBackoff(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn()
    } catch (error) {
      if (i === maxRetries - 1) throw error
      await sleep(1000 * Math.pow(2, i))
    }
  }
}
```

### **2. Dead Letter Queue**
```sql
CREATE TABLE webhook_failures (
  id UUID PRIMARY KEY,
  stripe_event_id TEXT,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  payload JSONB
);
```

### **3. Audit Logging**
```typescript
await supabase.from('audit_logs').insert({
  organization_id,
  action: 'subscription_created',
  resource_type: 'subscription',
  metadata: { plan_slug, amount }
})
```

### **4. Graceful Degradation**
```typescript
// Si webhook falla, cron job diario reconcilia
async function reconcileSubscriptions() {
  const subs = await stripe.subscriptions.list()
  for (const sub of subs.data) {
    await syncSubscriptionToDatabase(sub)
  }
}
```

---

## 🎓 JUSTIFICACIÓN PARA TESIS

### **Patrón: Event-Driven Architecture**
> "La arquitectura orientada a eventos permite desacoplar componentes del sistema, mejorando la escalabilidad y resiliencia mediante comunicación asíncrona basada en eventos" (Hohpe & Woolf, 2003)

**Aplicación:**
- Stripe emite eventos (checkout.session.completed)
- Webhooks consumen eventos de forma asíncrona
- Sistema reacciona actualizando estado
- Desacoplamiento total entre Stripe y Supabase

### **Patrón: Idempotencia**
> "Las operaciones idempotentes garantizan que ejecutar la misma operación múltiples veces produce el mismo resultado, esencial en sistemas distribuidos" (Kleppmann, 2017)

**Aplicación:**
- Tabla webhook_events con stripe_event_id único
- Verificación antes de procesar
- UPSERT en lugar de INSERT
- Retry seguro sin duplicación

### **Patrón: Defense in Depth**
> "La defensa en profundidad implementa múltiples capas de seguridad, de modo que si una falla, las demás siguen protegiendo el sistema" (NIST, 2020)

**Aplicación:**
- Capa 1: Verificación de firma webhook
- Capa 2: RLS en PostgreSQL
- Capa 3: Middleware en Edge Functions
- Capa 4: Guards en Frontend
- Capa 5: Audit logging

---

**🎉 FLUJO COMPLETO DOCUMENTADO Y LISTO PARA IMPLEMENTACIÓN!**