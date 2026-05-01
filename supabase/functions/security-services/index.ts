// =====================================================
// Security Services Management API
// =====================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { withAuth, withPlanLimits } from '../_shared/auth-middleware.ts'

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

  const url = new URL(req.url)

  switch (path) {
    case 'list':
      return await listServices(supabase, context)
    case 'executions':
      const domainId = url.searchParams.get('domainId')
      const status = url.searchParams.get('status')
      return await getExecutions(supabase, context, { domainId, status })
    case 'execution':
      const executionId = url.searchParams.get('id')
      return await getExecution(supabase, context, executionId)
    default:
      return new Response('Not found', { status: 404, headers: corsHeaders })
  }
}

async function handlePost(req: Request, supabase: any, path: string) {
  const { context, error } = await withAuth(req, ['execute_scans'])
  if (error) return error

  const body = await req.json()

  switch (path) {
    case 'execute':
      return await executeService(supabase, context, body)
    case 'schedule':
      return await scheduleService(supabase, context, body)
    default:
      return new Response('Not found', { status: 404, headers: corsHeaders })
  }
}

async function handlePut(req: Request, supabase: any, path: string) {
  const { context, error } = await withAuth(req, ['manage_services'])
  if (error) return error

  const body = await req.json()

  switch (path) {
    case 'cancel':
      return await cancelExecution(supabase, context, body)
    case 'retry':
      return await retryExecution(supabase, context, body)
    default:
      return new Response('Not found', { status: 404, headers: corsHeaders })
  }
}

// =====================================================
// Service Management Functions
// =====================================================

async function listServices(supabase: any, context: any) {
  // Get available services based on plan
  const enabledServices = context.subscription?.plan?.enabled_services || []

  const { data, error } = await supabase
    .from('security_services')
    .select('*')
    .eq('active', true)
    .in('slug', enabledServices)

  if (error) {
    return new Response(
      JSON.stringify({ error: 'Failed to fetch services' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  return new Response(
    JSON.stringify({ data }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function executeService(supabase: any, context: any, body: any) {
  const { serviceId, domainId, config } = body

  // Check plan limits
  const { allowed, error: limitError } = await withPlanLimits(context, 'scan')
  if (limitError) return limitError

  // Validate service is available in plan
  const { data: service, error: serviceError } = await supabase
    .from('security_services')
    .select('*')
    .eq('id', serviceId)
    .single()

  if (serviceError || !service) {
    return new Response(
      JSON.stringify({ error: 'Service not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const enabledServices = context.subscription?.plan?.enabled_services || []
  if (!enabledServices.includes(service.slug)) {
    return new Response(
      JSON.stringify({ error: 'Service not available in your plan' }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Create execution record
  const { data: execution, error: executionError } = await supabase
    .from('service_executions')
    .insert({
      organization_id: context.organization.id,
      domain_id: domainId,
      service_id: serviceId,
      config: { ...service.default_config, ...config },
      status: 'pending',
      triggered_by: 'manual',
      triggered_by_user_id: context.user.id
    })
    .select()
    .single()

  if (executionError) {
    return new Response(
      JSON.stringify({ error: 'Failed to create execution' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Record usage
  await supabase
    .from('usage_records')
    .insert({
      organization_id: context.organization.id,
      subscription_id: context.subscription?.id,
      resource_type: 'scan',
      quantity: 1,
      metadata: { service_id: serviceId, execution_id: execution.id }
    })

  // Queue execution (you would implement actual service execution here)
  await queueServiceExecution(execution, service)

  return new Response(
    JSON.stringify({ data: execution }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function getExecutions(supabase: any, context: any, filters: any) {
  let query = supabase
    .from('service_executions')
    .select(`
      *,
      domain:domains(domain, subdomain),
      service:security_services(name, slug),
      triggered_by_user:user_profiles(full_name, email)
    `)
    .eq('organization_id', context.organization.id)
    .order('created_at', { ascending: false })

  if (filters.domainId) {
    query = query.eq('domain_id', filters.domainId)
  }

  if (filters.status) {
    query = query.eq('status', filters.status)
  }

  const { data, error } = await query.limit(50)

  if (error) {
    return new Response(
      JSON.stringify({ error: 'Failed to fetch executions' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  return new Response(
    JSON.stringify({ data }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function getExecution(supabase: any, context: any, executionId: string) {
  if (!executionId) {
    return new Response(
      JSON.stringify({ error: 'Execution ID is required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const { data, error } = await supabase
    .from('service_executions')
    .select(`
      *,
      domain:domains(domain, subdomain),
      service:security_services(name, slug, description),
      triggered_by_user:user_profiles(full_name, email)
    `)
    .eq('id', executionId)
    .eq('organization_id', context.organization.id)
    .single()

  if (error) {
    return new Response(
      JSON.stringify({ error: 'Execution not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  return new Response(
    JSON.stringify({ data }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function handleDelete(req: Request, supabase: any, path: string) {
  const { context, error } = await withAuth(req, ['manage_services'])
  if (error) return error

  const url = new URL(req.url)
  const executionId = url.searchParams.get('id')

  switch (path) {
    case 'execution':
      return await deleteExecution(supabase, context, executionId)
    default:
      return new Response('Not found', { status: 404, headers: corsHeaders })
  }
}

async function scheduleService(supabase: any, context: any, body: any) {
  const { serviceId, domainId, schedule, config } = body

  // Create scheduled execution record
  const { data: execution, error: executionError } = await supabase
    .from('service_executions')
    .insert({
      organization_id: context.organization.id,
      domain_id: domainId,
      service_id: serviceId,
      config: config,
      status: 'scheduled',
      triggered_by: 'schedule',
      triggered_by_user_id: context.user.id,
      scheduled_for: schedule.next_run
    })
    .select()
    .single()

  if (executionError) {
    return new Response(
      JSON.stringify({ error: 'Failed to schedule service' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  return new Response(
    JSON.stringify({ data: execution }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function retryExecution(supabase: any, context: any, body: any) {
  const { executionId } = body

  // Get original execution
  const { data: originalExecution, error: fetchError } = await supabase
    .from('service_executions')
    .select('*')
    .eq('id', executionId)
    .eq('organization_id', context.organization.id)
    .single()

  if (fetchError || !originalExecution) {
    return new Response(
      JSON.stringify({ error: 'Execution not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Create new execution based on original
  const { data: newExecution, error: createError } = await supabase
    .from('service_executions')
    .insert({
      organization_id: originalExecution.organization_id,
      domain_id: originalExecution.domain_id,
      service_id: originalExecution.service_id,
      config: originalExecution.config,
      status: 'pending',
      triggered_by: 'retry',
      triggered_by_user_id: context.user.id,
      parent_execution_id: executionId
    })
    .select()
    .single()

  if (createError) {
    return new Response(
      JSON.stringify({ error: 'Failed to retry execution' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  return new Response(
    JSON.stringify({ data: newExecution }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function deleteExecution(supabase: any, context: any, executionId: string | null) {
  if (!executionId) {
    return new Response(
      JSON.stringify({ error: 'Execution ID is required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const { error } = await supabase
    .from('service_executions')
    .delete()
    .eq('id', executionId)
    .eq('organization_id', context.organization.id)

  if (error) {
    return new Response(
      JSON.stringify({ error: 'Failed to delete execution' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  return new Response(
    JSON.stringify({ success: true }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}
  const { executionId } = body

  const { data, error } = await supabase
    .from('service_executions')
    .update({
      status: 'cancelled',
      completed_at: new Date().toISOString()
    })
    .eq('id', executionId)
    .eq('organization_id', context.organization.id)
    .eq('status', 'running')
    .select()
    .single()

  if (error) {
    return new Response(
      JSON.stringify({ error: 'Failed to cancel execution' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  return new Response(
    JSON.stringify({ data }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

// =====================================================
// Service Execution Queue
// =====================================================

async function queueServiceExecution(execution: any, service: any) {
  // This would integrate with your actual service execution system
  // For now, we'll simulate with a simple timeout

  setTimeout(async () => {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    try {
      // Update status to running
      await supabase
        .from('service_executions')
        .update({
          status: 'running',
          started_at: new Date().toISOString()
        })
        .eq('id', execution.id)

      // Execute the actual service
      const results = await executeActualService(service, execution)

      // Update with results
      await supabase
        .from('service_executions')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          results,
          execution_time_seconds: Math.floor((Date.now() - new Date(execution.created_at).getTime()) / 1000)
        })
        .eq('id', execution.id)

    } catch (error) {
      // Update with error
      await supabase
        .from('service_executions')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          error_message: error.message
        })
        .eq('id', execution.id)
    }
  }, 1000) // Start execution after 1 second
}

async function executeActualService(service: any, execution: any) {
  // This is where you would implement the actual service execution
  // Based on service.slug, call the appropriate service

  switch (service.slug) {
    case 'perimeter_protection':
      return await executePerimeterProtection(execution)
    case 'vulnerability_scan':
      return await executeVulnerabilityScan(execution)
    case 'performance_test':
      return await executePerformanceTest(execution)
    case 'security_test':
      return await executeSecurityTest(execution)
    default:
      throw new Error(`Unknown service: ${service.slug}`)
  }
}

async function executePerimeterProtection(execution: any) {
  // Integrate with your existing Cloudflare protection logic
  return {
    protections_applied: ['ssl_strict', 'waf_enabled', 'ddos_protection'],
    status: 'success',
    details: 'Perimeter protection successfully configured'
  }
}

async function executeVulnerabilityScan(execution: any) {
  // Integrate with Shodan or other vulnerability scanning services
  return {
    vulnerabilities_found: 2,
    severity_breakdown: { high: 0, medium: 1, low: 1 },
    scan_coverage: '95%',
    details: 'Vulnerability scan completed successfully'
  }
}

async function executePerformanceTest(execution: any) {
  // Integrate with performance testing tools
  return {
    response_time_avg: 245,
    throughput: 1250,
    error_rate: 0.02,
    details: 'Performance test completed successfully'
  }
}

async function executeSecurityTest(execution: any) {
  // Integrate with Cypress or other security testing tools
  return {
    tests_run: 25,
    tests_passed: 23,
    tests_failed: 2,
    security_score: 92,
    details: 'Security test suite completed'
  }
}