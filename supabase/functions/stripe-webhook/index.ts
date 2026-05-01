// =====================================================
// Stripe Webhook Handler - Edge Function
// Handles Stripe webhook events for subscription management
// =====================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.21.0'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2023-10-16'
})

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

serve(async (req) => {
  const signature = req.headers.get('stripe-signature')
  
  if (!signature) {
    return new Response('No signature', { status: 400 })
  }

  try {
    const body = await req.text()
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? ''
    
    // Verify webhook signature
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    
    console.log(`Processing webhook: ${event.type}`)

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object)
        break
      
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object)
        break
      
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object)
        break
      
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object)
        break
      
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object)
        break
      
      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Webhook error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }
})

// =====================================================
// Event Handlers
// =====================================================

async function handleCheckoutCompleted(session: any) {
  console.log('Checkout completed:', session.id)
  
  const organizationId = session.metadata.organization_id
  const planId = session.metadata.plan_id
  const billingCycle = session.metadata.billing_cycle || 'monthly'

  if (!organizationId || !planId) {
    console.error('Missing metadata in checkout session')
    return
  }

  // Get subscription details from Stripe
  const subscription = await stripe.subscriptions.retrieve(session.subscription)

  // Create or update subscription in database
  const { error } = await supabase
    .from('subscriptions')
    .upsert({
      organization_id: organizationId,
      plan_id: planId,
      status: subscription.status,
      billing_cycle: billingCycle,
      stripe_subscription_id: subscription.id,
      stripe_customer_id: subscription.customer,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      trial_end: subscription.trial_end 
        ? new Date(subscription.trial_end * 1000).toISOString() 
        : null,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'stripe_subscription_id'
    })

  if (error) {
    console.error('Error creating subscription:', error)
    return
  }

  // Update organization status
  await supabase
    .from('organizations')
    .update({ 
      status: 'active',
      stripe_customer_id: subscription.customer
    })
    .eq('id', organizationId)

  // Send welcome notification
  await supabase
    .from('notifications')
    .insert({
      organization_id: organizationId,
      subject: 'Welcome to Cuban CAS!',
      body: 'Your subscription is now active. Start protecting your domains today!',
      type: 'success',
      category: 'billing',
      delivery_method: 'both'
    })

  console.log(`Subscription activated for organization: ${organizationId}`)
}

async function handleSubscriptionUpdated(subscription: any) {
  console.log('Subscription updated:', subscription.id)

  const { data: existingSub } = await supabase
    .from('subscriptions')
    .select('organization_id')
    .eq('stripe_subscription_id', subscription.id)
    .single()

  if (!existingSub) {
    console.error('Subscription not found in database')
    return
  }

  // Update subscription
  await supabase
    .from('subscriptions')
    .update({
      status: subscription.status,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      trial_end: subscription.trial_end 
        ? new Date(subscription.trial_end * 1000).toISOString() 
        : null,
      cancel_at_period_end: subscription.cancel_at_period_end,
      canceled_at: subscription.canceled_at 
        ? new Date(subscription.canceled_at * 1000).toISOString() 
        : null,
      updated_at: new Date().toISOString()
    })
    .eq('stripe_subscription_id', subscription.id)

  // Update organization status based on subscription status
  const orgStatus = subscription.status === 'active' || subscription.status === 'trialing'
    ? 'active'
    : subscription.status === 'past_due'
    ? 'suspended'
    : 'canceled'

  await supabase
    .from('organizations')
    .update({ status: orgStatus })
    .eq('id', existingSub.organization_id)

  console.log(`Subscription updated: ${subscription.id} -> ${subscription.status}`)
}

async function handleSubscriptionDeleted(subscription: any) {
  console.log('Subscription deleted:', subscription.id)

  const { data: existingSub } = await supabase
    .from('subscriptions')
    .select('organization_id')
    .eq('stripe_subscription_id', subscription.id)
    .single()

  if (!existingSub) {
    console.error('Subscription not found in database')
    return
  }

  // Update subscription status
  await supabase
    .from('subscriptions')
    .update({
      status: 'canceled',
      canceled_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('stripe_subscription_id', subscription.id)

  // Suspend organization
  await supabase
    .from('organizations')
    .update({ status: 'suspended' })
    .eq('id', existingSub.organization_id)

  // Send cancellation notification
  await supabase
    .from('notifications')
    .insert({
      organization_id: existingSub.organization_id,
      subject: 'Subscription Cancelled',
      body: 'Your subscription has been cancelled. Your services will be suspended.',
      type: 'warning',
      category: 'billing',
      delivery_method: 'both'
    })

  console.log(`Subscription cancelled for organization: ${existingSub.organization_id}`)
}

async function handlePaymentSucceeded(invoice: any) {
  console.log('Payment succeeded:', invoice.id)

  const subscriptionId = invoice.subscription

  if (!subscriptionId) return

  // Get subscription from database
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('organization_id')
    .eq('stripe_subscription_id', subscriptionId)
    .single()

  if (!sub) return

  // Create invoice record
  await supabase
    .from('invoices')
    .insert({
      organization_id: sub.organization_id,
      subscription_id: sub.organization_id,
      stripe_invoice_id: invoice.id,
      invoice_number: invoice.number,
      amount_due: invoice.amount_due,
      amount_paid: invoice.amount_paid,
      currency: invoice.currency.toUpperCase(),
      status: 'paid',
      period_start: new Date(invoice.period_start * 1000).toISOString(),
      period_end: new Date(invoice.period_end * 1000).toISOString(),
      paid_at: new Date().toISOString()
    })

  // Ensure organization is active
  await supabase
    .from('organizations')
    .update({ status: 'active' })
    .eq('id', sub.organization_id)

  console.log(`Payment recorded for organization: ${sub.organization_id}`)
}

async function handlePaymentFailed(invoice: any) {
  console.log('Payment failed:', invoice.id)

  const subscriptionId = invoice.subscription

  if (!subscriptionId) return

  // Get subscription from database
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('organization_id')
    .eq('stripe_subscription_id', subscriptionId)
    .single()

  if (!sub) return

  // Update subscription status
  await supabase
    .from('subscriptions')
    .update({ status: 'past_due' })
    .eq('stripe_subscription_id', subscriptionId)

  // Suspend organization
  await supabase
    .from('organizations')
    .update({ status: 'suspended' })
    .eq('id', sub.organization_id)

  // Send payment failed notification
  await supabase
    .from('notifications')
    .insert({
      organization_id: sub.organization_id,
      subject: 'Payment Failed',
      body: 'Your payment has failed. Please update your payment method to avoid service interruption.',
      type: 'error',
      category: 'billing',
      delivery_method: 'both'
    })

  console.log(`Payment failed for organization: ${sub.organization_id}`)
}