# 🚀 Deploy Edge Functions - Guía Completa

## 1. Preparar Entorno de Desarrollo

### 1.1 Instalar Dependencias
```bash
# Instalar Supabase CLI
npm install -g supabase

# Instalar Deno (requerido para Edge Functions)
# Windows
iwr https://deno.land/install.ps1 -useb | iex

# macOS/Linux
curl -fsSL https://deno.land/install.sh | sh

# Verificar instalación
deno --version
supabase --version
```

### 1.2 Configurar Proyecto
```bash
cd Cuban-CAS

# Inicializar Supabase (si no está hecho)
supabase init

# Login en Supabase
supabase login

# Vincular con tu proyecto
supabase link --project-ref your-project-ref
```

## 2. Estructura de Edge Functions

### 2.1 Verificar Estructura
```
Cuban-CAS/supabase/functions/
├── auth-middleware/
│   └── index.ts
├── organization-management/
│   └── index.ts
├── security-services/
│   └── index.ts
├── subscription-management/
│   └── index.ts
├── ai-reports/
│   └── index.ts
└── notifications/
    └── index.ts
```

### 2.2 Crear Función de Notificaciones
```typescript
// supabase/functions/notifications/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { withAuth } from '../auth-middleware/index.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  try {
    const url = new URL(req.url)
    const path = url.pathname.split('/').pop()

    switch (req.method) {
      case 'GET':
        return await handleGet(req, supabase, path)
      case 'POST':
        return await handlePost(req, supabase, path)
      case 'PUT':
        return await handlePut(req, supabase, path)
      default:
        return new Response('Method not allowed', { status: 405, headers: corsHeaders })
    }
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function handleGet(req: Request, supabase: any, path: string) {
  const { context, error } = await withAuth(req)
  if (error) return error

  switch (path) {
    case 'list':
      return await getNotifications(supabase, context)
    default:
      return new Response('Not found', { status: 404, headers: corsHeaders })
  }
}

async function handlePost(req: Request, supabase: any, path: string) {
  const { context, error } = await withAuth(req)
  if (error) return error

  const body = await req.json()

  switch (path) {
    case 'send':
      return await sendNotification(supabase, context, body)
    default:
      return new Response('Not found', { status: 404, headers: corsHeaders })
  }
}

async function handlePut(req: Request, supabase: any, path: string) {
  const { context, error } = await withAuth(req)
  if (error) return error

  const body = await req.json()

  switch (path) {
    case 'mark-read':
      return await markAsRead(supabase, context, body)
    default:
      return new Response('Not found', { status: 404, headers: corsHeaders })
  }
}

async function getNotifications(supabase: any, context: any) {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('organization_id', context.organization.id)
    .or(`user_id.is.null,user_id.eq.${context.user.id}`)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    return new Response(
      JSON.stringify({ error: 'Failed to fetch notifications' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  return new Response(
    JSON.stringify({ data }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function sendNotification(supabase: any, context: any, body: any) {
  const { subject, message, type = 'in_app', user_id } = body

  const { data, error } = await supabase
    .from('notifications')
    .insert({
      organization_id: context.organization.id,
      user_id,
      subject,
      body: message,
      type,
      status: 'pending'
    })
    .select()
    .single()

  if (error) {
    return new Response(
      JSON.stringify({ error: 'Failed to send notification' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  return new Response(
    JSON.stringify({ data }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function markAsRead(supabase: any, context: any, body: any) {
  const { notification_ids } = body

  const { error } = await supabase
    .from('notifications')
    .update({
      status: 'read',
      read_at: new Date().toISOString()
    })
    .in('id', notification_ids)
    .eq('organization_id', context.organization.id)

  if (error) {
    return new Response(
      JSON.stringify({ error: 'Failed to mark notifications as read' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  return new Response(
    JSON.stringify({ success: true }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}
```

## 3. Configurar Variables de Entorno

### 3.1 Variables Requeridas
```bash
# Configurar todas las variables necesarias
supabase secrets set STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
supabase secrets set OPENAI_API_KEY=sk-your_openai_api_key
supabase secrets set CF_API_TOKEN=your_cloudflare_api_token
supabase secrets set CF_ZONE_ID=your_cloudflare_zone_id
supabase secrets set TURNSTILE_SECRET_KEY=your_turnstile_secret_key

# Verificar que se configuraron correctamente
supabase secrets list
```

### 3.2 Variables de Desarrollo vs Producción
```bash
# Para desarrollo (opcional)
supabase secrets set --env development STRIPE_SECRET_KEY=sk_test_...
supabase secrets set --env development OPENAI_API_KEY=sk-...

# Para producción
supabase secrets set --env production STRIPE_SECRET_KEY=sk_live_...
supabase secrets set --env production OPENAI_API_KEY=sk-...
```

## 4. Deploy Individual de Funciones

### 4.1 Deploy Auth Middleware
```bash
supabase functions deploy auth-middleware --no-verify-jwt
```

### 4.2 Deploy Organization Management
```bash
supabase functions deploy organization-management
```

### 4.3 Deploy Security Services
```bash
supabase functions deploy security-services
```

### 4.4 Deploy Subscription Management
```bash
supabase functions deploy subscription-management
```

### 4.5 Deploy AI Reports
```bash
supabase functions deploy ai-reports
```

### 4.6 Deploy Notifications
```bash
supabase functions deploy notifications
```

## 5. Deploy Todas las Funciones

### 5.1 Deploy Completo
```bash
# Deploy todas las funciones de una vez
supabase functions deploy

# O con verificación JWT deshabilitada para middleware
supabase functions deploy --no-verify-jwt
```

### 5.2 Verificar Deploy
```bash
# Listar funciones deployadas
supabase functions list

# Ver logs de deploy
supabase functions logs
```

## 6. Testing de Edge Functions

### 6.1 Test Local (Desarrollo)
```bash
# Iniciar funciones localmente
supabase functions serve

# Test en otra terminal
curl http://localhost:54321/functions/v1/organization-management/profile \
  -H "Authorization: Bearer your-jwt-token"
```

### 6.2 Test en Producción
```bash
# Test de función de organización
curl https://your-project.supabase.co/functions/v1/organization-management/profile \
  -H "Authorization: Bearer your-jwt-token"

# Test de función de servicios
curl https://your-project.supabase.co/functions/v1/security-services/list \
  -H "Authorization: Bearer your-jwt-token"

# Test de función de suscripciones
curl https://your-project.supabase.co/functions/v1/subscription-management/plans
```

## 7. Configurar Webhooks de Stripe

### 7.1 Crear Webhook en Stripe
1. Ve a **Developers > Webhooks** en Stripe Dashboard
2. Click **Add endpoint**
3. URL: `https://your-project.supabase.co/functions/v1/subscription-management/webhook`
4. Eventos:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`

### 7.2 Configurar Webhook Secret
```bash
# Copiar el signing secret de Stripe y configurarlo
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
```

### 7.3 Test de Webhook
```bash
# Test manual de webhook
curl -X POST https://your-project.supabase.co/functions/v1/subscription-management/webhook \
  -H "Content-Type: application/json" \
  -H "Stripe-Signature: your-test-signature" \
  -d '{"type": "checkout.session.completed", "data": {"object": {"id": "cs_test_123"}}}'
```

## 8. Monitoreo y Logs

### 8.1 Ver Logs en Tiempo Real
```bash
# Logs de todas las funciones
supabase functions logs

# Logs de una función específica
supabase functions logs --function-name organization-management

# Logs con filtro
supabase functions logs --level error
```

### 8.2 Configurar Alertas
En Supabase Dashboard > **Edge Functions > Logs**:
- Configurar alertas por errores
- Configurar alertas por latencia alta
- Configurar alertas por rate limiting

## 9. Performance y Optimización

### 9.1 Configurar Timeouts
```typescript
// En cada función, configurar timeout
export const config = {
  timeout: 30000, // 30 segundos
  memory: 512,    // 512 MB
}
```

### 9.2 Optimizar Cold Starts
```typescript
// Inicializar conexiones fuera del handler
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

// Reutilizar conexiones HTTP
const httpClient = new HTTPClient({
  keepAlive: true,
  timeout: 10000
})
```

### 9.3 Implementar Caching
```typescript
// Cache en memoria para datos frecuentes
const cache = new Map()

async function getCachedData(key: string, fetcher: () => Promise<any>, ttl = 300000) {
  const cached = cache.get(key)
  if (cached && Date.now() - cached.timestamp < ttl) {
    return cached.data
  }

  const data = await fetcher()
  cache.set(key, { data, timestamp: Date.now() })
  return data
}
```

## 10. Troubleshooting

### 10.1 Errores Comunes

#### Error: "Function not found"
```bash
# Verificar que la función se deployó
supabase functions list

# Re-deploy si es necesario
supabase functions deploy function-name
```

#### Error: "Environment variable not found"
```bash
# Verificar variables configuradas
supabase secrets list

# Configurar variable faltante
supabase secrets set VARIABLE_NAME=value
```

#### Error: "JWT verification failed"
```bash
# Para funciones que no requieren JWT
supabase functions deploy function-name --no-verify-jwt

# O configurar JWT correctamente en el frontend
```

### 10.2 Debug de Funciones
```typescript
// Agregar logging detallado
console.log('Function called with:', { method: req.method, url: req.url })
console.log('Headers:', Object.fromEntries(req.headers.entries()))
console.log('Body:', await req.text())
```

### 10.3 Test de Conectividad
```bash
# Test básico de conectividad
curl https://your-project.supabase.co/functions/v1/health

# Test con autenticación
curl https://your-project.supabase.co/functions/v1/organization-management/profile \
  -H "Authorization: Bearer $(supabase auth token)"
```

## 11. CI/CD Automation

### 11.1 GitHub Actions
```yaml
# .github/workflows/deploy-functions.yml
name: Deploy Edge Functions

on:
  push:
    branches: [main]
    paths: ['supabase/functions/**']

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Supabase CLI
        uses: supabase/setup-cli@v1
        with:
          version: latest
          
      - name: Deploy functions
        run: |
          supabase login --token ${{ secrets.SUPABASE_ACCESS_TOKEN }}
          supabase link --project-ref ${{ secrets.SUPABASE_PROJECT_REF }}
          supabase functions deploy
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
          SUPABASE_PROJECT_REF: ${{ secrets.SUPABASE_PROJECT_REF }}
```

### 11.2 Pre-deploy Checks
```bash
# Script para verificar antes de deploy
#!/bin/bash
echo "Running pre-deploy checks..."

# Verificar sintaxis TypeScript
deno check supabase/functions/**/*.ts

# Verificar variables de entorno
supabase secrets list | grep -q "STRIPE_SECRET_KEY" || echo "Missing STRIPE_SECRET_KEY"
supabase secrets list | grep -q "OPENAI_API_KEY" || echo "Missing OPENAI_API_KEY"

# Test de funciones localmente
supabase functions serve &
sleep 5
curl -f http://localhost:54321/functions/v1/organization-management/profile || exit 1

echo "Pre-deploy checks passed!"
```

## ✅ Checklist de Deploy

- [ ] Supabase CLI instalado y configurado
- [ ] Deno instalado
- [ ] Proyecto vinculado con Supabase
- [ ] Variables de entorno configuradas
- [ ] Todas las funciones deployadas exitosamente
- [ ] Webhooks de Stripe configurados
- [ ] Tests de funciones pasando
- [ ] Logs y monitoreo configurados
- [ ] Performance optimizada
- [ ] CI/CD configurado (opcional)

## 📚 Recursos

- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Deno Documentation](https://deno.land/manual)
- [Supabase CLI Reference](https://supabase.com/docs/reference/cli)
- [Edge Functions Examples](https://github.com/supabase/supabase/tree/master/examples/edge-functions)