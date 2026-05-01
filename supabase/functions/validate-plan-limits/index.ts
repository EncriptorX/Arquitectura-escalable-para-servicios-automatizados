// =====================================================
// Validate Plan Limits - Edge Function
// Validates if organization can perform action based on plan
// =====================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { withAuth, logAuditEvent } from '../_shared/auth-middleware.ts'

interface ValidationRequest {
  resource_type: 'scan' | 'domain' | 'report' | 'user'
  quantity?: number
  metadata?: Record<string, any>
}

interface ValidationResponse {
  allowed: boolean
  current_usage: number
  plan_limit: number
  remaining: number
  plan_name: string
  upgrade_required: boolean
  message: string
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

    // Parse request body
    const body: ValidationRequest = await req.json()
    const { resource_type, quantity = 1, metadata = {} } = body

    // Validate input
    if (!resource_type || !['scan', 'domain', 'report', 'user'].includes(resource_type)) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid resource_type',
          valid_types: ['scan', 'domain', 'report', 'user']
        }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    // Create Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Check plan limits using database function
    const { data: limitCheck, error: limitError } = await supabase
      .rpc('check_plan_limit', {
        p_organization_id: context.organization.id,
        p_resource_type: resource_type,
        p_quantity: quantity
      })

    if (limitError) {
      console.error('Error checking plan limits:', limitError)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to check plan limits',
          details: limitError.message 
        }),
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    const result = limitCheck[0]

    // Build response message
    let message = ''
    if (result.allowed) {
      message = `Action allowed. ${result.remaining} ${resource_type}(s) remaining this period.`
    } else {
      message = `Limit exceeded. You've used ${result.current_usage}/${result.plan_limit} ${resource_type}(s) on the ${result.plan_name} plan.`
      
      if (result.upgrade_required) {
        message += ' Please upgrade your plan to continue.'
      }
    }

    const response: ValidationResponse = {
      allowed: result.allowed,
      current_usage: result.current_usage,
      plan_limit: result.plan_limit,
      remaining: result.remaining,
      plan_name: result.plan_name,
      upgrade_required: result.upgrade_required,
      message
    }

    // Log validation attempt
    await logAuditEvent(
      context,
      'validate_plan_limit',
      'plan_limit',
      undefined,
      {
        resource_type,
        quantity,
        allowed: result.allowed,
        ...metadata
      }
    )

    // Return response
    return new Response(
      JSON.stringify(response),
      { 
        status: result.allowed ? 200 : 429,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    )

  } catch (error) {
    console.error('Validation error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
})
