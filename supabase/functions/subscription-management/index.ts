// =====================================================
// Subscription & Payment Management API
// =====================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { withAuth } from '../_shared/auth-middleware.ts'
import Stripe from 'https://esm.sh/stripe@14.21.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2023-10-16',
})

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
    case 'plans':
      return await getPlans(supabase)
    case 'current':
      return await getCurrentSubscription(supabase, context)
    case 'invoices':
      return await getInvoices(supabase, context)
    case 'usage':
      return await getUsage(supabase, context)
    default:
      return new Response('Not found', { status: 404, headers: corsHeaders })
  }
}

async function handlePost(req: Request, supabase: any, path: string) {
  const { context, error } = await withAuth(req)
  if (error) return error

  const body = await req.json()

  switch (path) {
    case 'create-checkout':
      return await createCheckoutSession(supabase, context, body)
    case 'create-portal':
      return await createPortalSession(supabase, context)
    case 'webhook':
      return await handleWebhook(req, supabase)
    default:
      return new Response('Not found', { status: 404, headers: corsHeaders })
  }
}

async function handlePut(req: Request, supabase: any, path: string) {
  const { context, error } = await withAuth(req, ['manage_billing'])
  if (error) return error

  const body = await req.json()

  switch (path) {
    case 'change-plan':
      return await changePlan(supabase, context, body)
    case 'cancel':
      return await cancelSubscription(supabase, context)
    case 'reactivate':
      return await reactivateSubscription(supabase, context)
    default:
      return new Response('Not found', { status: 404, headers: corsHeaders })
  }
}

// =====================================================
// Plan Management
// =====================================================

async function getPlans(supabase: any) {
  const { data, error } = await supabase
    .from('plans')
    .select('*')
    .eq('active', true)
    .order('price_monthly', { ascending: true })

  if (error) {
    return new Response(
      JSON.stringify({ error: 'Failed to fetch plans' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  return new Response(
    JSON.stringify({ data }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function getCurrentSubscription(supabase: any, context: any) {
  const { data, error } = await supabase
    .from('subscriptions')
    .select(`
      *,
      plan:plans(*),
      organization:organizations(*)
    `)
    .eq('organization_id', context.organization.id)
    .eq('status', 'active')
    .single()

  if (error && error.code !== 'PGRST116') { // Not found is OK
    return new Response(
      JSON.stringify({ error: 'Failed to fetch subscription' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  return new Response(
    JSON.stringify({ data }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

// =====================================================
// Stripe Integration
// =====================================================

async function createCheckoutSession(supabase: any, context: any, body: any) {
  const { planId, billingCycle = 'monthly' } = body

  // Get plan details
  const { data: plan, error: planError } = await supabase
    .from('plans')
    .select('*')
    .eq('id', planId)
    .single()

  if (planError || !plan) {
    return new Response(
      JSON.stringify({ error: 'Plan not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Get or create Stripe customer
  let customerId = context.organization.stripe_customer_id

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: context.organization.billing_email || context.user.email,
      name: context.organization.name,
      metadata: {
        organization_id: context.organization.id
      }
    })

    customerId = customer.id

    // Update organization with customer ID
    await supabase
      .from('organizations')
      .update({ stripe_customer_id: customerId })
      .eq('id', context.organization.id)
  }

  // Create checkout session
  const priceId = billingCycle === 'yearly' 
    ? plan.stripe_price_id_yearly 
    : plan.stripe_price_id_monthly

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    mode: 'subscription',
    success_url: `${Deno.env.get('FRONTEND_URL') || 'http://localhost:3000'}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${Deno.env.get('FRONTEND_URL') || 'http://localhost:3000'}/pricing`,
    metadata: {
      organization_id: context.organization.id,
      plan_id: planId,
      billing_cycle: billingCycle
    }
  })

  return new Response(
    JSON.stringify({ data: { checkout_url: session.url } }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function createPortalSession(supabase: any, context: any) {
  const customerId = context.organization.stripe_customer_id

  if (!customerId) {
    return new Response(
      JSON.stringify({ error: 'No billing account found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${Deno.env.get('FRONTEND_URL') || 'http://localhost:3000'}/dashboard/billing`,
  })

  return new Response(
    JSON.stringify({ data: { portal_url: session.url } }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

// =====================================================
// Stripe Webhooks
// =====================================================

async function handleWebhook(req: Request, supabase: any) {
  const signature = req.headers.get('stripe-signature')
  const body = await req.text()

  if (!signature) {
    return new Response('Missing signature', { status: 400 })
  }

  try {
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? ''
    )

    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(supabase, event.data.object)
        break
      case 'customer.subscription.created':
        await handleSubscriptionCreated(supabase, event.data.object)
        break
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(supabase, event.data.object)
        break
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(supabase, event.data.object)
        break
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(supabase, event.data.object)
        break
      case 'invoice.payment_failed':
        await handlePaymentFailed(supabase, event.data.object)
        break
    }

    return new Response('OK', { status: 200 })
  } catch (error) {
    console.error('Webhook error:', error)
    return new Response('Webhook error', { status: 400 })
  }
}

async function handleCheckoutCompleted(supabase: any, session: any) {
  const organizationId = session.metadata.organization_id
  const planId = session.metadata.plan_id

  // Update organization
  await supabase
    .from('organizations')
    .update({
      stripe_customer_id: session.customer,
      subscription_status: 'active'
    })
    .eq('id', organizationId)
}

async function handleSubscriptionCreated(supabase: any, subscription: any) {
  // Get organization by customer ID
  const { data: org } = await supabase
    .from('organizations')
    .select('id')
    .eq('stripe_customer_id', subscription.customer)
    .single()

  if (!org) return

  // Get plan by price ID
  const priceId = subscription.items.data[0].price.id
  const { data: plan } = await supabase
    .from('plans')
    .select('id')
    .or(`stripe_price_id_monthly.eq.${priceId},stripe_price_id_yearly.eq.${priceId}`)
    .single()

  if (!plan) return

  // Create subscription record
  await supabase
    .from('subscriptions')
    .insert({
      organization_id: org.id,
      plan_id: plan.id,
      stripe_subscription_id: subscription.id,
      stripe_customer_id: subscription.customer,
      status: subscription.status,
      billing_cycle: subscription.items.data[0].price.recurring.interval === 'year' ? 'yearly' : 'monthly',
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null
    })

  // Update organization plan
  await supabase
    .from('organizations')
    .update({ plan_id: plan.id })
    .eq('id', org.id)
}

async function handleSubscriptionUpdated(supabase: any, subscription: any) {
  await supabase
    .from('subscriptions')
    .update({
      status: subscription.status,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null
    })
    .eq('stripe_subscription_id', subscription.id)
}

async function handleSubscriptionDeleted(supabase: any, subscription: any) {
  await supabase
    .from('subscriptions')
    .update({
      status: 'canceled',
      canceled_at: new Date().toISOString()
    })
    .eq('stripe_subscription_id', subscription.id)
}

async function handlePaymentSucceeded(supabase: any, invoice: any) {
  // Create invoice record
  await supabase
    .from('invoices')
    .upsert({
      stripe_invoice_id: invoice.id,
      invoice_number: invoice.number,
      amount_due: invoice.amount_due / 100,
      amount_paid: invoice.amount_paid / 100,
      currency: invoice.currency.toUpperCase(),
      status: invoice.status,
      period_start: new Date(invoice.period_start * 1000).toISOString(),
      period_end: new Date(invoice.period_end * 1000).toISOString(),
      paid_at: new Date(invoice.status_transitions.paid_at * 1000).toISOString()
    })
}

async function handlePaymentFailed(supabase: any, invoice: any) {
  // Update invoice status
  await supabase
    .from('invoices')
    .update({ status: 'payment_failed' })
    .eq('stripe_invoice_id', invoice.id)

  // TODO: Send payment failed notification
}

// =====================================================
// Usage & Billing
// =====================================================

async function getUsage(supabase: any, context: any) {
  const currentMonth = new Date()
  currentMonth.setDate(1)
  currentMonth.setHours(0, 0, 0, 0)

  const nextMonth = new Date(currentMonth)
  nextMonth.setMonth(nextMonth.getMonth() + 1)

  const { data, error } = await supabase
    .from('usage_records')
    .select('resource_type, quantity, recorded_at')
    .eq('organization_id', context.organization.id)
    .gte('recorded_at', currentMonth.toISOString())
    .lt('recorded_at', nextMonth.toISOString())
    .order('recorded_at', { ascending: false })

  if (error) {
    return new Response(
      JSON.stringify({ error: 'Failed to fetch usage' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Aggregate usage
  const aggregated = data.reduce((acc: any, record: any) => {
    acc[record.resource_type] = (acc[record.resource_type] || 0) + record.quantity
    return acc
  }, {})

  return new Response(
    JSON.stringify({
      data: {
        period: {
          start: currentMonth.toISOString(),
          end: nextMonth.toISOString()
        },
        usage: aggregated,
        details: data
      }
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function getInvoices(supabase: any, context: any) {
  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('organization_id', context.organization.id)
    .order('created_at', { ascending: false })
    .limit(12)

  if (error) {
    return new Response(
      JSON.stringify({ error: 'Failed to fetch invoices' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  return new Response(
    JSON.stringify({ data }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}