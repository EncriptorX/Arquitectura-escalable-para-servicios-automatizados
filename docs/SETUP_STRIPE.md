# 💳 Configuración de Stripe - Sistema de Pagos

## 1. Crear Cuenta en Stripe

### 1.1 Registro
1. Ve a [stripe.com](https://stripe.com)
2. Crea una cuenta de desarrollador
3. Completa la verificación de identidad
4. Activa el modo de pruebas (Test Mode)

### 1.2 Obtener API Keys
En **Developers > API Keys**:
- **Publishable key**: `pk_test_...` (para frontend)
- **Secret key**: `sk_test_...` (para backend)

## 2. Crear Productos y Precios

### 2.1 Crear Productos
En **Products** crea los siguientes productos:

#### Free Plan
- **Name**: Free Plan
- **Description**: Basic security monitoring for small projects

#### Basic Plan
- **Name**: Basic Plan  
- **Description**: Essential security for growing businesses

#### Pro Plan
- **Name**: Pro Plan
- **Description**: Comprehensive security for professional teams

#### Enterprise Plan
- **Name**: Enterprise Plan
- **Description**: Advanced security for large organizations

### 2.2 Crear Precios
Para cada producto, crea precios mensuales y anuales:

```javascript
// Ejemplo de precios a crear
const prices = [
  // Basic Plan
  { product: 'basic', amount: 2900, interval: 'month' }, // $29/mes
  { product: 'basic', amount: 29000, interval: 'year' }, // $290/año
  
  // Pro Plan
  { product: 'pro', amount: 9900, interval: 'month' },   // $99/mes
  { product: 'pro', amount: 99000, interval: 'year' },   // $990/año
  
  // Enterprise Plan
  { product: 'enterprise', amount: 29900, interval: 'month' }, // $299/mes
  { product: 'enterprise', amount: 299000, interval: 'year' }  // $2990/año
]
```

### 2.3 Actualizar Base de Datos
Actualiza la tabla `plans` con los Price IDs de Stripe:

```sql
-- Actualizar con los Price IDs reales de Stripe
UPDATE plans SET 
  stripe_price_id_monthly = 'price_1234567890',
  stripe_price_id_yearly = 'price_0987654321'
WHERE slug = 'basic';

UPDATE plans SET 
  stripe_price_id_monthly = 'price_abcdefghij',
  stripe_price_id_yearly = 'price_jihgfedcba'
WHERE slug = 'pro';

-- Repetir para todos los planes
```

## 3. Configurar Webhooks

### 3.1 Crear Webhook Endpoint
En **Developers > Webhooks** > **Add endpoint**:

- **Endpoint URL**: `https://your-project.supabase.co/functions/v1/subscription-management/webhook`
- **Events to send**:
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_succeeded`
  - `invoice.payment_failed`

### 3.2 Obtener Webhook Secret
Copia el **Signing secret** (empieza con `whsec_...`)

### 3.3 Configurar en Supabase
```bash
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
```

## 4. Configurar Customer Portal

### 4.1 Activar Customer Portal
En **Settings > Billing > Customer Portal**:
- ✅ Enable customer portal
- ✅ Allow customers to update payment methods
- ✅ Allow customers to view invoices
- ✅ Allow customers to update billing information

### 4.2 Configurar Business Information
- **Business name**: CAS Platform
- **Support email**: support@your-domain.com
- **Support phone**: +1-xxx-xxx-xxxx

## 5. Testing de Integración

### 5.1 Test Cards de Stripe
Usa estas tarjetas de prueba:

```javascript
// Tarjetas de prueba
const testCards = {
  success: '4242424242424242',
  declined: '4000000000000002',
  requiresAuth: '4000002500003155',
  insufficientFunds: '4000000000009995'
}
```

### 5.2 Test de Checkout
```bash
# Test crear sesión de checkout
curl -X POST https://your-project.supabase.co/functions/v1/subscription-management/create-checkout \
  -H "Authorization: Bearer your-jwt-token" \
  -H "Content-Type: application/json" \
  -d '{
    "planId": "plan-uuid",
    "billingCycle": "monthly"
  }'
```

### 5.3 Test de Webhooks
En **Developers > Webhooks** > tu webhook > **Send test webhook**

## 6. Configurar Variables de Entorno

### 6.1 Frontend
```bash
# .env
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### 6.2 Backend (Supabase)
```bash
supabase secrets set STRIPE_SECRET_KEY=sk_test_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
```

## 7. Implementar Frontend de Pagos

### 7.1 Instalar Stripe.js
```bash
npm install @stripe/stripe-js @stripe/react-stripe-js
```

### 7.2 Componente de Checkout
```typescript
// src/components/Billing/CheckoutButton.tsx
import { loadStripe } from '@stripe/stripe-js'

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)

export function CheckoutButton({ planId, billingCycle }: CheckoutButtonProps) {
  const handleCheckout = async () => {
    const response = await fetch('/functions/v1/subscription-management/create-checkout', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ planId, billingCycle })
    })
    
    const { data } = await response.json()
    window.location.href = data.checkout_url
  }

  return (
    <button onClick={handleCheckout} className="btn-primary">
      Subscribe to Plan
    </button>
  )
}
```

## 8. Configurar Facturación

### 8.1 Configurar Tax Settings
En **Settings > Tax**:
- Configura tax rates según tu jurisdicción
- Habilita automatic tax collection si es necesario

### 8.2 Configurar Invoices
En **Settings > Billing > Invoices**:
- Personaliza el template de facturas
- Configura información de la empresa
- Habilita PDF invoices

## 9. Monitoreo y Analytics

### 9.1 Dashboard de Stripe
Monitorea en **Dashboard**:
- Revenue metrics
- Customer growth
- Failed payments
- Churn rate

### 9.2 Configurar Alertas
En **Settings > Notifications**:
- Failed payments
- Successful payments
- Subscription changes
- Disputes

## 10. Producción

### 10.1 Activar Live Mode
1. Completa la verificación de cuenta
2. Cambia a Live Mode
3. Obtén las Live API keys
4. Actualiza variables de entorno

### 10.2 Configurar Webhook en Producción
- URL: `https://your-production-domain.com/functions/v1/subscription-management/webhook`
- Usar Live webhook secret

## ✅ Checklist de Stripe

- [ ] Cuenta Stripe creada y verificada
- [ ] Productos y precios configurados
- [ ] Price IDs actualizados en base de datos
- [ ] Webhooks configurados y funcionando
- [ ] Customer Portal activado
- [ ] Variables de entorno configuradas
- [ ] Frontend de pagos implementado
- [ ] Tests de checkout exitosos
- [ ] Facturación configurada
- [ ] Monitoreo activo

## 🚨 Troubleshooting

### Error: "No such price"
- Verifica que los Price IDs en la base de datos coinciden con Stripe
- Asegúrate de estar en el modo correcto (test/live)

### Error: "Webhook signature verification failed"
- Verifica que el webhook secret es correcto
- Revisa que la URL del webhook es accesible

### Error: "Customer not found"
- Verifica que el customer se creó correctamente en Stripe
- Revisa los logs de la función de checkout

## 📚 Recursos

- [Stripe Documentation](https://stripe.com/docs)
- [Stripe Testing](https://stripe.com/docs/testing)
- [Webhooks Guide](https://stripe.com/docs/webhooks)
- [Customer Portal](https://stripe.com/docs/billing/subscriptions/customer-portal)