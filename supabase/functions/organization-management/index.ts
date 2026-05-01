// =====================================================
// Organization Management API
// =====================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { withAuth } from '../_shared/auth-middleware.ts'

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
      case 'DELETE':
        return await handleDelete(req, supabase, path)
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
    case 'profile':
      return await getOrganizationProfile(supabase, context)
    case 'members':
      return await getOrganizationMembers(supabase, context)
    case 'usage':
      return await getUsageStats(supabase, context)
    default:
      return new Response('Not found', { status: 404, headers: corsHeaders })
  }
}

async function handlePost(req: Request, supabase: any, path: string) {
  const { context, error } = await withAuth(req, ['manage_organization'])
  if (error) return error

  const body = await req.json()

  switch (path) {
    case 'create':
      return await createOrganization(supabase, context, body)
    case 'invite':
      return await inviteUser(supabase, context, body)
    default:
      return new Response('Not found', { status: 404, headers: corsHeaders })
  }
}

async function handlePut(req: Request, supabase: any, path: string) {
  const { context, error } = await withAuth(req, ['manage_organization'])
  if (error) return error

  const body = await req.json()

  switch (path) {
    case 'update':
      return await updateOrganization(supabase, context, body)
    case 'member':
      return await updateMember(supabase, context, body)
    default:
      return new Response('Not found', { status: 404, headers: corsHeaders })
  }
}

async function handleDelete(req: Request, supabase: any, path: string) {
  const { context, error } = await withAuth(req, ['manage_organization'])
  if (error) return error

  const url = new URL(req.url)
  const memberId = url.searchParams.get('memberId')

  switch (path) {
    case 'member':
      return await removeMember(supabase, context, memberId)
    default:
      return new Response('Not found', { status: 404, headers: corsHeaders })
  }
}

// =====================================================
// Organization Management Functions
// =====================================================

async function getOrganizationProfile(supabase: any, context: any) {
  const { data, error } = await supabase
    .from('organizations')
    .select(`
      *,
      subscription:subscriptions(
        *,
        plan:plans(*)
      )
    `)
    .eq('id', context.organization.id)
    .single()

  if (error) {
    return new Response(
      JSON.stringify({ error: 'Failed to fetch organization' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  return new Response(
    JSON.stringify({ data }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function getOrganizationMembers(supabase: any, context: any) {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('organization_id', context.organization.id)
    .order('created_at', { ascending: false })

  if (error) {
    return new Response(
      JSON.stringify({ error: 'Failed to fetch members' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  return new Response(
    JSON.stringify({ data }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function getUsageStats(supabase: any, context: any) {
  const currentMonth = new Date()
  currentMonth.setDate(1)
  currentMonth.setHours(0, 0, 0, 0)

  const nextMonth = new Date(currentMonth)
  nextMonth.setMonth(nextMonth.getMonth() + 1)

  // Get current month usage
  const { data: usage, error: usageError } = await supabase
    .from('usage_records')
    .select('resource_type, quantity')
    .eq('organization_id', context.organization.id)
    .gte('recorded_at', currentMonth.toISOString())
    .lt('recorded_at', nextMonth.toISOString())

  if (usageError) {
    return new Response(
      JSON.stringify({ error: 'Failed to fetch usage stats' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Aggregate usage by resource type
  const aggregatedUsage = usage.reduce((acc: any, record: any) => {
    acc[record.resource_type] = (acc[record.resource_type] || 0) + record.quantity
    return acc
  }, {})

  // Get plan limits
  const planLimits = {
    scans: context.subscription?.plan?.max_scans_per_month || 0,
    domains: context.subscription?.plan?.max_domains || 0
  }

  return new Response(
    JSON.stringify({
      data: {
        usage: aggregatedUsage,
        limits: planLimits,
        period: {
          start: currentMonth.toISOString(),
          end: nextMonth.toISOString()
        }
      }
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function createOrganization(supabase: any, context: any, body: any) {
  const { name, slug, domain } = body

  // Create organization
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .insert({
      name,
      slug,
      domain,
      plan_id: null // Will be set when subscription is created
    })
    .select()
    .single()

  if (orgError) {
    return new Response(
      JSON.stringify({ error: 'Failed to create organization' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Update user profile to link to organization
  const { error: profileError } = await supabase
    .from('user_profiles')
    .update({
      organization_id: org.id,
      role: 'admin'
    })
    .eq('id', context.user.id)

  if (profileError) {
    return new Response(
      JSON.stringify({ error: 'Failed to link user to organization' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  return new Response(
    JSON.stringify({ data: org }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function updateOrganization(supabase: any, context: any, body: any) {
  const { name, domain, settings } = body

  const { data, error } = await supabase
    .from('organizations')
    .update({
      name,
      domain,
      settings,
      updated_at: new Date().toISOString()
    })
    .eq('id', context.organization.id)
    .select()
    .single()

  if (error) {
    return new Response(
      JSON.stringify({ error: 'Failed to update organization' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  return new Response(
    JSON.stringify({ data }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function inviteUser(supabase: any, context: any, body: any) {
  const { email, role, permissions } = body

  // Create invitation (you might want to use a separate invitations table)
  // For now, we'll create a user profile with pending status
  const { data, error } = await supabase
    .from('user_profiles')
    .insert({
      email,
      organization_id: context.organization.id,
      role,
      permissions,
      status: 'invited'
    })
    .select()
    .single()

  if (error) {
    return new Response(
      JSON.stringify({ error: 'Failed to invite user' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // TODO: Send invitation email

  return new Response(
    JSON.stringify({ data }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function updateMember(supabase: any, context: any, body: any) {
  const { memberId, role, permissions, status } = body

  const { data, error } = await supabase
    .from('user_profiles')
    .update({
      role,
      permissions,
      status,
      updated_at: new Date().toISOString()
    })
    .eq('id', memberId)
    .eq('organization_id', context.organization.id)
    .select()
    .single()

  if (error) {
    return new Response(
      JSON.stringify({ error: 'Failed to update member' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  return new Response(
    JSON.stringify({ data }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function removeMember(supabase: any, context: any, memberId: string) {
  if (!memberId) {
    return new Response(
      JSON.stringify({ error: 'Member ID is required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const { error } = await supabase
    .from('user_profiles')
    .delete()
    .eq('id', memberId)
    .eq('organization_id', context.organization.id)

  if (error) {
    return new Response(
      JSON.stringify({ error: 'Failed to remove member' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  return new Response(
    JSON.stringify({ success: true }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}