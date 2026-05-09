// =====================================================
// AI-Powered Reports Generation
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
      return await listReports(supabase, context)
    case 'report':
      const reportId = url.searchParams.get('id')
      return await getReport(supabase, context, reportId)
    case 'download':
      const downloadId = url.searchParams.get('id')
      return await downloadReport(supabase, context, downloadId)
    default:
      return new Response('Not found', { status: 404, headers: corsHeaders })
  }
}

async function handlePost(req: Request, supabase: any, path: string) {
  const { context, error } = await withAuth(req, ['generate_reports'])
  if (error) return error

  const body = await req.json()

  switch (path) {
    case 'generate':
      return await generateReport(supabase, context, body)
    case 'regenerate':
      return await regenerateReport(supabase, context, body)
    default:
      return new Response('Not found', { status: 404, headers: corsHeaders })
  }
}

async function regenerateReport(supabase: any, context: any, body: any) {
  const { reportId } = body

  // Get existing report
  const { data: existingReport, error: fetchError } = await supabase
    .from('reports')
    .select('*')
    .eq('id', reportId)
    .eq('organization_id', context.organization.id)
    .single()

  if (fetchError || !existingReport) {
    return new Response(
      JSON.stringify({ error: 'Report not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Update report status to regenerating
  const { error: updateError } = await supabase
    .from('reports')
    .update({
      status: 'generating',
      regenerated_at: new Date().toISOString()
    })
    .eq('id', reportId)

  if (updateError) {
    return new Response(
      JSON.stringify({ error: 'Failed to regenerate report' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Get domain for regeneration
  const { data: domain } = await supabase
    .from('domains')
    .select('*')
    .eq('id', existingReport.domain_id)
    .single()

  // Queue regeneration
  await queueReportGeneration(existingReport, domain, existingReport.report_type, true)

  return new Response(
    JSON.stringify({ data: existingReport }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

// =====================================================
// Report Management Functions
// =====================================================

async function listReports(supabase: any, context: any) {
  const { data, error } = await supabase
    .from('reports')
    .select(`
      *,
      domain:domains(domain, subdomain)
    `)
    .eq('organization_id', context.organization.id)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    return new Response(
      JSON.stringify({ error: 'Failed to fetch reports' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  return new Response(
    JSON.stringify({ data }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function getReport(supabase: any, context: any, reportId: string) {
  if (!reportId) {
    return new Response(
      JSON.stringify({ error: 'Report ID is required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const { data, error } = await supabase
    .from('reports')
    .select(`
      *,
      domain:domains(domain, subdomain)
    `)
    .eq('id', reportId)
    .eq('organization_id', context.organization.id)
    .single()

  if (error) {
    return new Response(
      JSON.stringify({ error: 'Report not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  return new Response(
    JSON.stringify({ data }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function generateReport(supabase: any, context: any, body: any) {
  const { domainId, reportType, format = 'pdf', includeRecommendations = true } = body

  // Check plan limits
  const { allowed, error: limitError } = await withPlanLimits(context, 'report')
  if (limitError) return limitError

  // Validate domain belongs to organization
  const { data: domain, error: domainError } = await supabase
    .from('domains')
    .select('*')
    .eq('id', domainId)
    .eq('organization_id', context.organization.id)
    .single()

  if (domainError || !domain) {
    return new Response(
      JSON.stringify({ error: 'Domain not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Create report record
  const { data: report, error: reportError } = await supabase
    .from('reports')
    .insert({
      organization_id: context.organization.id,
      domain_id: domainId,
      title: `${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report - ${domain.domain}`,
      report_type: reportType,
      format,
      status: 'generating',
      generated_by_ai: true
    })
    .select()
    .single()

  if (reportError) {
    return new Response(
      JSON.stringify({ error: 'Failed to create report' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Record usage
  await supabase
    .from('usage_records')
    .insert({
      organization_id: context.organization.id,
      subscription_id: context.subscription?.id,
      resource_type: 'report',
      quantity: 1,
      metadata: { report_id: report.id, report_type: reportType }
    })

  // Queue report generation
  await queueReportGeneration(report, domain, reportType, includeRecommendations)

  return new Response(
    JSON.stringify({ data: report }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

// =====================================================
// AI Report Generation
// =====================================================

async function queueReportGeneration(report: any, domain: any, reportType: string, includeRecommendations: boolean) {
  // This would be queued in a proper job system
  setTimeout(async () => {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    try {
      // Gather data for report
      const reportData = await gatherReportData(supabase, domain, reportType)
      
      // Generate AI content
      const aiContent = await generateAIContent(reportData, reportType, includeRecommendations)
      
      // Generate PDF/HTML
      const fileUrl = await generateReportFile(aiContent, report.format)
      
      // Update report with results
      await supabase
        .from('reports')
        .update({
          status: 'completed',
          summary: aiContent.summary,
          findings: aiContent.findings,
          recommendations: aiContent.recommendations,
          file_url: fileUrl,
          generated_at: new Date().toISOString()
        })
        .eq('id', report.id)

      // Send notification
      await sendReportNotification(supabase, report, domain)

    } catch (error) {
      console.error('Report generation failed:', error)
      
      await supabase
        .from('reports')
        .update({
          status: 'failed',
          error_message: error.message
        })
        .eq('id', report.id)
    }
  }, 2000) // Start generation after 2 seconds
}

async function gatherReportData(supabase: any, domain: any, reportType: string) {
  // Get recent executions for this domain
  const { data: executions } = await supabase
    .from('service_executions')
    .select(`
      *,
      service:security_services(name, slug, service_type)
    `)
    .eq('domain_id', domain.id)
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })
    .limit(10)

  // Filter executions by report type
  const relevantExecutions = executions?.filter((exec: any) => {
    switch (reportType) {
      case 'security':
        return ['perimeter', 'vulnerability', 'security_test'].includes(exec.service?.service_type)
      case 'performance':
        return exec.service?.service_type === 'performance'
      case 'vulnerability':
        return exec.service?.service_type === 'vulnerability'
      case 'comprehensive':
        return true
      default:
        return true
    }
  }) || []

  return {
    domain,
    executions: relevantExecutions,
    reportType,
    generatedAt: new Date().toISOString()
  }
}

async function generateAIContent(reportData: any, reportType: string, includeRecommendations: boolean) {
  const deepseekApiKey = Deno.env.get('DEEPSEEK_API_KEY')

  if (!deepseekApiKey) {
    throw new Error('DeepSeek API key not configured. Set DEEPSEEK_API_KEY in environment variables.')
  }

  const prompt = buildReportPrompt(reportData, reportType, includeRecommendations)

  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${deepseekApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: 'Eres un experto en ciberseguridad generando reportes profesionales de seguridad. Responde SIEMPRE con JSON válido siguiendo exactamente la estructura solicitada. Proporciona análisis detallados y recomendaciones accionables basadas en los datos proporcionados.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
      max_tokens: 3000,
      response_format: { type: 'json_object' },
    }),
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`DeepSeek API error ${response.status}: ${errText}`)
  }

  const aiResponse = await response.json()
  const content = aiResponse.choices?.[0]?.message?.content

  if (!content) {
    throw new Error('DeepSeek returned empty response')
  }

  try {
    return JSON.parse(content)
  } catch {
    // Fallback si la respuesta no es JSON válido
    return {
      summary: content.substring(0, 500),
      findings: [
        {
          title: 'Análisis de Seguridad',
          severity: 'info',
          description: content,
        },
      ],
      recommendations: includeRecommendations
        ? [
            {
              title: 'Revisión General',
              priority: 'medium',
              description: 'Revise el análisis detallado e implemente las medidas de seguridad sugeridas.',
            },
          ]
        : [],
    }
  }
}

function buildReportPrompt(reportData: any, reportType: string, includeRecommendations: boolean) {
  const { domain, executions } = reportData

  let prompt = `Generate a ${reportType} security report for domain: ${domain.domain}\n\n`
  
  prompt += `Recent security scan results:\n`
  executions.forEach((exec: any, index: number) => {
    prompt += `${index + 1}. ${exec.service?.name} (${exec.service?.service_type})\n`
    prompt += `   Status: ${exec.status}\n`
    prompt += `   Results: ${JSON.stringify(exec.results, null, 2)}\n\n`
  })

  prompt += `Please provide a JSON response with the following structure:
{
  "summary": "Executive summary of findings (max 300 words)",
  "findings": [
    {
      "title": "Finding title",
      "severity": "critical|high|medium|low|info",
      "description": "Detailed description",
      "evidence": "Supporting evidence",
      "impact": "Potential impact"
    }
  ]`

  if (includeRecommendations) {
    prompt += `,
  "recommendations": [
    {
      "title": "Recommendation title",
      "priority": "high|medium|low",
      "description": "Detailed recommendation",
      "implementation": "How to implement",
      "timeline": "Suggested timeline"
    }
  ]`
  }

  prompt += `
}

Focus on actionable insights and prioritize findings by risk level.`

  return prompt
}

async function generateReportFile(content: any, format: string) {
  // This would integrate with a PDF generation service
  // For now, we'll simulate file generation
  
  const fileName = `report-${Date.now()}.${format}`
  const fileUrl = `https://storage.example.com/reports/${fileName}`
  
  // In a real implementation, you would:
  // 1. Generate PDF using a library like Puppeteer or jsPDF
  // 2. Upload to Supabase Storage or S3
  // 3. Return the public URL
  
  return fileUrl
}

async function sendReportNotification(supabase: any, report: any, domain: any) {
  // Create notification
  await supabase
    .from('notifications')
    .insert({
      organization_id: report.organization_id,
      subject: `Security Report Ready: ${domain.domain}`,
      body: `Your ${report.report_type} report for ${domain.domain} has been generated and is ready for download.`,
      type: 'in_app',
      status: 'pending',
      metadata: {
        report_id: report.id,
        domain_id: domain.id,
        action_url: `/dashboard/reports/${report.id}`
      }
    })

  // TODO: Send email notification if enabled
}

async function downloadReport(supabase: any, context: any, reportId: string) {
  if (!reportId) {
    return new Response(
      JSON.stringify({ error: 'Report ID is required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const { data: report, error } = await supabase
    .from('reports')
    .select('file_url, format, title')
    .eq('id', reportId)
    .eq('organization_id', context.organization.id)
    .single()

  if (error || !report) {
    return new Response(
      JSON.stringify({ error: 'Report not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  if (!report.file_url) {
    return new Response(
      JSON.stringify({ error: 'Report file not available' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Redirect to file URL or proxy the file
  return Response.redirect(report.file_url, 302)
}