// =====================================================
// Subscription Guard Middleware
// Validates active subscription before allowing operations
// =====================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { AuthContext } from './auth-middleware.ts'

export interface SubscriptionCheckResult {
  allowed: boolean
  error: Response | null
  subscription?: any
  reason?: string
}

/**
 * Verifica que la organización tenga una suscripción activa
 * Implementa defensa en profundidad (Defense in Depth)
 */
export async function requireActiveSubscription(
  context: AuthContext
): Promise<SubscriptionCheckResult> {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  try {
    // =====================================================
    // CAPA 1: Verificar estado de organización
    // =====================================================
    
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('status, name')
      .eq('id', context.organization.id)
      .single()

    if (orgError || !org) {
      return {
        allowed: false,
        reason: 'organization_not_found',
        error: new Response(
          JSON.stringify({
            error: 'Organization not found',
            message: 'Unable to verify organization status',
            code: 'ORG_NOT_FOUND'
          }),
          { 
            status: 404,
            headers: { 'Content-Type': 'application/json' }
          }
        )
      }
    }

    // Verificar que organización esté activa
    if (org.status !== 'active') {
      return {
        allowed: false,
        reason: 'organization_suspended',
        error: new Response(
          JSON.stringify({
            error: 'Organization suspended',
            message: `Your organization "${org.name}" is currently ${org.status}. Please contact support or update your payment method.`,
            status: org.status,
            code: 'ORG_SUSPENDED',
            action_required: org.status === 'suspended' ? 'update_payment' : 'contact_support',
            support_url: `${Deno.env.get('APP_URL')}/support`,
            billing_url: `${Deno.env.get('APP_URL')}/billing`
          }),
          { 
            status: 402, // Payment Required
            headers: { 'Content-Type': 'application/json' }
          }
        )
      }
    }

    // =====================================================
    // CAPA 2: Verificar suscripción activa
    // =====================================================
    
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select(`
        *,
        plan:plans(
          name,
          slug,
          max_domains,
          max_scans_per_month,
          max_reports_per_month
        )
      `)
      .eq('organization_id', context.organization.id)
      .in('status', ['active', 'trialing'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (subError || !subscription) {
      // Verificar si tiene plan free
      const { data: freeSub } = await supabase
        .from('subscriptions')
        .select('*, plan:plans(*)')
        .eq('organization_id', context.organization.id)
        .eq('plans.slug', 'free')
        .single()

      if (freeSub) {
        // Plan free está permitido
        return {
          allowed: true,
          error: null,
          subscription: freeSub
        }
      }

      return {
        allowed: false,
        reason: 'no_active_subscription',
        error: new Response(
          JSON.stringify({
            error: 'No active subscription',
            message: 'Please subscribe to a plan to use this service.',
            code: 'NO_SUBSCRIPTION',
            action_required: 'subscribe',
            pricing_url: `${Deno.env.get('APP_URL')}/pricing`
          }),
          { 
            status: 402,
            headers: { 'Content-Type': 'application/json' }
          }
        )
      }
    }

    // =====================================================
    // CAPA 3: Verificar período de suscripción
    // =====================================================
    
    const now = new Date()
    const periodEnd = new Date(subscription.current_period_end)

    if (periodEnd < now) {
      return {
        allowed: false,
        reason: 'subscription_expired',
        error: new Response(
          JSON.stringify({
            error: 'Subscription expired',
            message: 'Your subscription has expired. Please renew to continue using our services.',
            code: 'SUBSCRIPTION_EXPIRED',
            expired_at: subscription.current_period_end,
            plan_name: subscription.plan?.name,
            action_required: 'renew',
            billing_url: `${Deno.env.get('APP_URL')}/billing`
          }),
          { 
            status: 402,
            headers: { 'Content-Type': 'application/json' }
          }
        )
      }
    }

    // =====================================================
    // CAPA 4: Verificar trial expirado
    // =====================================================
    
    if (subscription.status === 'trialing' && subscription.trial_end) {
      const trialEnd = new Date(subscription.trial_end)
      
      if (trialEnd < now) {
        return {
          allowed: false,
          reason: 'trial_expired',
          error: new Response(
            JSON.stringify({
              error: 'Trial expired',
              message: 'Your trial period has ended. Please subscribe to continue.',
              code: 'TRIAL_EXPIRED',
              trial_ended_at: subscription.trial_end,
              action_required: 'subscribe',
              pricing_url: `${Deno.env.get('APP_URL')}/pricing`
            }),
            { 
              status: 402,
              headers: { 'Content-Type': 'application/json' }
            }
          )
        }
      }
    }

    // =====================================================
    // TODO CORRECTO: Permitir operación
    // =====================================================
    
    return {
      allowed: true,
      error: null,
      subscription
    }

  } catch (error) {
    console.error('Subscription check error:', error)
    
    return {
      allowed: false,
      reason: 'check_failed',
      error: new Response(
        JSON.stringify({
          error: 'Subscription verification failed',
          message: 'Unable to verify subscription status. Please try again.',
          code: 'VERIFICATION_FAILED',
          details: error.message
        }),
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }
  }
}

/**
 * Verifica que la organización no exceda los límites de su plan
 */
export async function checkPlanLimits(
  context: AuthContext,
  resourceType: 'scan' | 'domain' | 'report' | 'user',
  quantity: number = 1
): Promise<SubscriptionCheckResult> {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  try {
    // Primero verificar suscripción activa
    const subCheck = await requireActiveSubscription(context)
    if (!subCheck.allowed) {
      return subCheck
    }

    // Verificar límites usando función de base de datos
    const { data: limitCheck, error: limitError } = await supabase
      .rpc('check_plan_limit', {
        p_organization_id: context.organization.id,
        p_resource_type: resourceType,
        p_quantity: quantity
      })

    if (limitError) {
      throw limitError
    }

    const result = limitCheck[0]

    if (!result.allowed) {
      return {
        allowed: false,
        reason: 'limit_exceeded',
        subscription: subCheck.subscription,
        error: new Response(
          JSON.stringify({
            error: 'Plan limit exceeded',
            message: `You've reached your ${resourceType} limit for the ${result.plan_name} plan.`,
            code: 'LIMIT_EXCEEDED',
            current_usage: result.current_usage,
            plan_limit: result.plan_limit,
            remaining: result.remaining,
            plan_name: result.plan_name,
            resource_type: resourceType,
            action_required: 'upgrade',
            upgrade_url: `${Deno.env.get('APP_URL')}/pricing`
          }),
          { 
            status: 429, // Too Many Requests
            headers: { 'Content-Type': 'application/json' }
          }
        )
      }
    }

    return {
      allowed: true,
      error: null,
      subscription: subCheck.subscription
    }

  } catch (error) {
    console.error('Plan limit check error:', error)
    
    return {
      allowed: false,
      reason: 'check_failed',
      error: new Response(
        JSON.stringify({
          error: 'Limit verification failed',
          message: 'Unable to verify plan limits. Please try again.',
          code: 'LIMIT_CHECK_FAILED',
          details: error.message
        }),
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }
  }
}

/**
 * Wrapper combinado: Verifica autenticación, suscripción y límites
 */
export async function withSubscriptionGuard(
  req: Request,
  resourceType?: 'scan' | 'domain' | 'report' | 'user',
  quantity?: number
): Promise<{
  context: AuthContext | null
  subscription: any | null
  error: Response | null
}> {
  // Importar withAuth dinámicamente para evitar dependencias circulares
  const { withAuth } = await import('./auth-middleware.ts')
  
  // Verificar autenticación
  const { context, error: authError } = await withAuth(req)
  if (authError) {
    return { context: null, subscription: null, error: authError }
  }

  // Verificar suscripción activa
  const subCheck = await requireActiveSubscription(context!)
  if (!subCheck.allowed) {
    return { context, subscription: null, error: subCheck.error }
  }

  // Si se especifica recurso, verificar límites
  if (resourceType) {
    const limitCheck = await checkPlanLimits(context!, resourceType, quantity)
    if (!limitCheck.allowed) {
      return { context, subscription: subCheck.subscription, error: limitCheck.error }
    }
  }

  return {
    context,
    subscription: subCheck.subscription,
    error: null
  }
}
