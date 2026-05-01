// =====================================================
// Create Stripe Checkout Session - Edge Function
// Creates a Stripe checkout session for plan subscription
// =====================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.21.0'
import { withAuth, logAuditEvent } from '../_shared/auth-middleware.ts'

interface CheckoutRequest {
  plan_slug: string
  billing_cycle: 'monthly' | 'yearly'
  success_url?: string
  cancel_url?: string
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, content-type'
      }
    })
  }

  try {
    // Authenticate request
    const { context, error: authError } = await withAuth(req)
    if (authError) return authError

    // Only admins can create subscriptions
    if (context.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Only organization admins can manage subscriptions' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Parse request
    const body: CheckoutRequest = await req.json()
    const { 
      plan_slug, 
      billing_cycle = 'monthly',
      success_url = `${Deno.env.get('APP_URL')}/dashboard?checkout=success`,
      cancel_url = `${Deno.env.get('APP_URL')}/pricing?checkout=cancelled`
    } = body

    // Validate input
    if (!plan_slug || !['free', 'basic', 'pro', 'enterprise'].includes(plan_slug)) {
      return new Response(
        JSON.stringify({ error: 'Invalid plan_slug' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Free plan doesn't need checkout
    if (plan_slug === 'free') {
      return new Response(
        JSON.stringify({ 
          error: 'Free plan does not require checkout',
          message: 'Free plan is automatically assigned'
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Create Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get plan details
    const { data: plan, error: planError } = await supabase
      .from('plans')
      .select('*')
      .eq('slug', plan_slug)
      .eq('active', true)
      .single()

    if (planError || !plan) {
      return new Response(
        JSON.stringify({ error: 'Plan not found or inactive' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Get Stripe price ID
    const stripePriceId = billing_cycle === 'monthly' 
      ? plan.stripe_price_id_monthly 
      : plan.stripe_price_id_yearly

    if (!stripePriceId) {
      return new Response(
        JSON.stringify({ 
          error: 'Stripe price ID not configured for this plan',
          plan: plan_slug,
          billing_cycle
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
      apiVersion: '2023-10-16'
    })

    // Get or create Stripe customer
    let stripeCustomerId = context.organization.stripe_customer_id

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: context.organization.billing_email || context.user.email,
        name: context.organization.name,
        metadata: {
          organization_id: context.organization.id,
          organization_slug: context.organization.slug
        }
      })

      stripeCustomerId = customer.id

      // Update organization with Stripe customer ID
      await supabase
        .from('organizations')
        .update({ stripe_customer_id: stripeCustomerId })
        .eq('id', context.organization.id)
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: stripePriceId,
          quantity: 1
        }
      ],
      success_url,
      cancel_url,
      metadata: {
        organization_id: context.organization.id,
        plan_id: plan.id,
        plan_slug: plan_slug,
        billing_cycle: billing_cycle,
        user_id: context.user.id
      },
      subscription_data: {
        metadata: {
          organization_id: context.organization.id,
          plan_id: plan.id
        },
        trial_period_days: plan_slug === 'basic' ? 14 : 0
      },
      allow_promotion_codes: true,
      billing_address_collection: 'required'
    })

    // Log checkout creation
    await logAuditEvent(
      context,
      'create_checkout_session',
      'subscription',
      undefined,
      {
        plan_slug,
        billing_cycle,
        session_id: session.id,
        amount: billing_cycle === 'monthly' ? plan.price_monthly : plan.price_yearly
      }
    )

    // Return checkout URL
    return new Response(
      JSON.stringify({
        checkout_url: session.url,
        session_id: session.id,
        plan: {
          name: plan.name,
          slug: plan_slug,
          billing_cycle,
          amount: billing_cycle === 'monthly' ? plan.price_monthly : plan.price_yearly
        }
      }),
      { 
        status: 200,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    )

  } catch (error) {
    console.error('Checkout creation error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Failed to create checkout session',
        details: error.message 
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
})