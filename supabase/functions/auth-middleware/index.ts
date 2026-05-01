// =====================================================
// Authentication & Authorization Middleware
// =====================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

export interface AuthContext {
  user: any
  organization: any
  subscription: any
  permissions: string[]
}

export async function withAuth(
  req: Request,
  requiredPermissions: string[] = []
): Promise<{ context: AuthContext | null; error: Response | null }> {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? ''
  )

  // Extract JWT token
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return {
      context: null,
      error: new Response(
        JSON.stringify({ error: 'Missing or invalid authorization header' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }
  }

  const token = authHeader.substring(7)

  try {
    // Verify JWT and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return {
        context: null,
        error: new Response(
          JSON.stringify({ error: 'Invalid or expired token' }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        )
      }
    }

    // Get user profile with organization
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select(`
        *,
        organization:organizations(*)
      `)
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return {
        context: null,
        error: new Response(
          JSON.stringify({ error: 'User profile not found' }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        )
      }
    }

    // Get active subscription
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select(`
        *,
        plan:plans(*)
      `)
      .eq('organization_id', profile.organization_id)
      .eq('status', 'active')
      .single()

    // Check permissions
    const userPermissions = profile.permissions || []
    const hasRequiredPermissions = requiredPermissions.every(permission =>
      userPermissions.includes(permission) || profile.role === 'admin'
    )

    if (requiredPermissions.length > 0 && !hasRequiredPermissions) {
      return {
        context: null,
        error: new Response(
          JSON.stringify({ error: 'Insufficient permissions' }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        )
      }
    }

    return {
      context: {
        user,
        organization: profile.organization,
        subscription,
        permissions: userPermissions
      },
      error: null
    }
  } catch (error) {
    return {
      context: null,
      error: new Response(
        JSON.stringify({ error: 'Authentication failed' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }
  }
}

export async function withPlanLimits(
  context: AuthContext,
  resourceType: string,
  quantity: number = 1
): Promise<{ allowed: boolean; error: Response | null }> {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  try {
    // Check current usage
    const { data: usage, error: usageError } = await supabase
      .rpc('check_plan_limits', {
        org_id: context.organization.id,
        resource_type: resourceType
      })

    if (usageError) {
      return {
        allowed: false,
        error: new Response(
          JSON.stringify({ error: 'Failed to check plan limits' }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        )
      }
    }

    if (!usage) {
      return {
        allowed: false,
        error: new Response(
          JSON.stringify({ 
            error: 'Plan limit exceeded',
            message: `You have reached your ${resourceType} limit. Please upgrade your plan.`
          }),
          { status: 429, headers: { 'Content-Type': 'application/json' } }
        )
      }
    }

    return { allowed: true, error: null }
  } catch (error) {
    return {
      allowed: false,
      error: new Response(
        JSON.stringify({ error: 'Failed to validate plan limits' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }
  }
}