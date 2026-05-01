// =====================================================
// Authentication & Authorization Middleware (Shared)
// Multi-Tenant Zero Trust Implementation
// =====================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

export interface AuthContext {
  user: any
  organization: any
  subscription: any
  permissions: string[]
  role: string
  member_status: string
}

export async function withAuth(
  req: Request,
  requiredPermissions: string[] = []
): Promise<{ context: AuthContext | null; error: Response | null }> {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
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

    // Get user organization context using the new multi-tenant function
    const { data: contextData, error: contextError } = await supabase
      .rpc('get_user_organization_context', { user_uuid: user.id })

    if (contextError || !contextData || contextData.length === 0) {
      return {
        context: null,
        error: new Response(
          JSON.stringify({ 
            error: 'User not associated with any active organization',
            details: contextError?.message 
          }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        )
      }
    }

    const orgContext = contextData[0] // Take first active membership

    // Verify member is active
    if (orgContext.member_status !== 'active') {
      return {
        context: null,
        error: new Response(
          JSON.stringify({ 
            error: 'User membership is not active',
            status: orgContext.member_status 
          }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        )
      }
    }

    // Get full organization details
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', orgContext.organization_id)
      .single()

    if (orgError || !organization) {
      return {
        context: null,
        error: new Response(
          JSON.stringify({ error: 'Organization not found' }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        )
      }
    }

    // Get active subscription with plan details
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select(`
        *,
        plan:plans(*)
      `)
      .eq('organization_id', orgContext.organization_id)
      .eq('status', 'active')
      .single()

    // Check permissions if required
    const userPermissions = orgContext.permissions || []
    if (requiredPermissions.length > 0) {
      const hasRequiredPermissions = requiredPermissions.every(permission =>
        userPermissions.includes(permission) || orgContext.user_role === 'admin'
      )

      if (!hasRequiredPermissions) {
        return {
          context: null,
          error: new Response(
            JSON.stringify({ 
              error: 'Insufficient permissions',
              required: requiredPermissions,
              user_role: orgContext.user_role,
              user_permissions: userPermissions
            }),
            { status: 403, headers: { 'Content-Type': 'application/json' } }
          )
        }
      }
    }

    return {
      context: {
        user,
        organization,
        subscription,
        permissions: userPermissions,
        role: orgContext.user_role,
        member_status: orgContext.member_status
      },
      error: null
    }
  } catch (error) {
    return {
      context: null,
      error: new Response(
        JSON.stringify({ 
          error: 'Authentication failed',
          details: error.message 
        }),
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
    // Check plan limits using the new function
    const { data: allowed, error: limitError } = await supabase
      .rpc('check_organization_plan_limits', {
        org_id: context.organization.id,
        resource_type: resourceType
      })

    if (limitError) {
      return {
        allowed: false,
        error: new Response(
          JSON.stringify({ 
            error: 'Failed to check plan limits',
            details: limitError.message 
          }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        )
      }
    }

    if (!allowed) {
      // Get current usage and limits for detailed error
      const currentMonth = new Date()
      currentMonth.setDate(1)
      currentMonth.setHours(0, 0, 0, 0)

      const { data: usage } = await supabase
        .from('usage_records')
        .select('quantity')
        .eq('organization_id', context.organization.id)
        .eq('resource_type', resourceType)
        .gte('recorded_at', currentMonth.toISOString())

      const currentUsage = usage?.reduce((sum, record) => sum + record.quantity, 0) || 0
      
      // Get plan limit
      let planLimit = 0
      if (context.subscription?.plan) {
        switch (resourceType) {
          case 'scan':
            planLimit = context.subscription.plan.max_scans_per_month || 0
            break
          case 'domain':
            planLimit = context.subscription.plan.max_domains || 0
            break
          case 'report':
            planLimit = context.subscription.plan.features?.max_reports_per_month || 10
            break
          case 'user':
            planLimit = context.subscription.plan.features?.max_users || 5
            break
        }
      }

      return {
        allowed: false,
        error: new Response(
          JSON.stringify({ 
            error: `${resourceType} limit exceeded`,
            current_usage: currentUsage,
            plan_limit: planLimit,
            plan_name: context.subscription?.plan?.name || 'Free',
            upgrade_required: true
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
        JSON.stringify({ 
          error: 'Failed to validate plan limits',
          details: error.message 
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }
  }
}

// Helper function to check specific permission
export async function hasPermission(
  context: AuthContext,
  permission: string
): Promise<boolean> {
  // Admin has all permissions
  if (context.role === 'admin') {
    return true
  }

  // Check specific permission
  return context.permissions.includes(permission)
}

// Helper function to require specific role
export function requireRole(
  context: AuthContext,
  allowedRoles: string[]
): { allowed: boolean; error: Response | null } {
  if (!allowedRoles.includes(context.role)) {
    return {
      allowed: false,
      error: new Response(
        JSON.stringify({ 
          error: 'Insufficient role privileges',
          required_roles: allowedRoles,
          user_role: context.role
        }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      )
    }
  }

  return { allowed: true, error: null }
}

// Helper function to log audit events
export async function logAuditEvent(
  context: AuthContext,
  action: string,
  resourceType: string,
  resourceId?: string,
  metadata?: any
): Promise<void> {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  try {
    await supabase
      .from('audit_logs')
      .insert({
        organization_id: context.organization.id,
        user_id: context.user.id,
        action,
        resource_type: resourceType,
        resource_id: resourceId,
        metadata: metadata || {}
      })
  } catch (error) {
    console.error('Failed to log audit event:', error)
    // Don't throw - audit logging failure shouldn't break the main operation
  }
}