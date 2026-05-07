// =====================================================
// Edge Function: audit-log
// Registro sistemático de acciones críticas
// =====================================================
// Recibe eventos de auditoría desde el frontend y los
// persiste en audit_logs usando service_role para
// garantizar escritura independiente de RLS.
// =====================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { withAuth }      from '../_shared/auth-middleware.ts'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// ── Acciones que se pueden registrar desde el frontend ──
const ALLOWED_ACTIONS = new Set([
  // Auth
  'user_login', 'user_logout', 'user_register',
  'password_reset_requested', 'password_changed',
  'session_expired',
  // Datos
  'domain_created', 'domain_updated', 'domain_deleted',
  'report_generated', 'report_downloaded', 'report_deleted',
  'scan_started', 'scan_completed', 'scan_failed', 'scan_canceled',
  // Admin
  'member_invited', 'member_role_changed', 'member_removed',
  'organization_settings_updated',
  // Billing
  'subscription_upgraded', 'subscription_canceled',
  'checkout_started', 'checkout_completed',
  // Seguridad
  'permission_denied', 'plan_limit_reached',
  'suspicious_activity_detected',
])

// ── Severidad por acción ──────────────────────────────
const ACTION_SEVERITY: Record<string, 'info' | 'warning' | 'critical'> = {
  user_login:                    'info',
  user_logout:                   'info',
  user_register:                 'info',
  password_reset_requested:      'warning',
  password_changed:              'warning',
  session_expired:               'info',
  domain_deleted:                'warning',
  report_deleted:                'warning',
  member_removed:                'warning',
  member_role_changed:           'warning',
  permission_denied:             'warning',
  plan_limit_reached:            'warning',
  suspicious_activity_detected:  'critical',
  subscription_canceled:         'warning',
}

// ── Categoría por acción ──────────────────────────────
const ACTION_CATEGORY: Record<string, string> = {
  user_login:                   'auth',
  user_logout:                  'auth',
  user_register:                'auth',
  password_reset_requested:     'auth',
  password_changed:             'auth',
  session_expired:              'auth',
  domain_created:               'data',
  domain_updated:               'data',
  domain_deleted:               'data',
  report_generated:             'data',
  report_downloaded:            'data',
  report_deleted:               'data',
  scan_started:                 'security',
  scan_completed:               'security',
  scan_failed:                  'security',
  scan_canceled:                'security',
  member_invited:               'admin',
  member_role_changed:          'admin',
  member_removed:               'admin',
  organization_settings_updated:'admin',
  subscription_upgraded:        'billing',
  subscription_canceled:        'billing',
  checkout_started:             'billing',
  checkout_completed:           'billing',
  permission_denied:            'security',
  plan_limit_reached:           'security',
  suspicious_activity_detected: 'security',
}

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS })
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )
  }

  // Autenticar — el usuario debe estar logueado para registrar eventos
  const { context, error: authError } = await withAuth(req)
  if (authError) return authError

  // Parsear body
  let body: any
  try {
    body = await req.json()
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON body' }),
      { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )
  }

  const { action, resource_type, resource_id, result = 'success', metadata = {} } = body

  // Validar acción
  if (!action || !ALLOWED_ACTIONS.has(action)) {
    return new Response(
      JSON.stringify({ error: 'Invalid or disallowed action', allowed: [...ALLOWED_ACTIONS] }),
      { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )
  }

  if (!resource_type) {
    return new Response(
      JSON.stringify({ error: 'resource_type is required' }),
      { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )
  }

  // Extraer contexto de red
  const ip_address = req.headers.get('x-forwarded-for')
    ?? req.headers.get('x-real-ip')
    ?? null
  const user_agent = req.headers.get('user-agent') ?? null

  // Usar service_role para escribir en audit_logs (bypass RLS)
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  const { data: log_id, error: logError } = await supabase.rpc('log_audit_event', {
    p_user_id:       context!.user.id,
    p_org_id:        context!.organization.id,
    p_action:        action,
    p_resource_type: resource_type,
    p_resource_id:   resource_id ?? null,
    p_result:        result,
    p_severity:      ACTION_SEVERITY[action] ?? 'info',
    p_category:      ACTION_CATEGORY[action] ?? 'system',
    p_metadata:      {
      ...metadata,
      user_role:  context!.role,
      plan:       context!.organization.plan,
    },
    p_ip_address:    ip_address,
    p_user_agent:    user_agent,
    p_session_id:    req.headers.get('x-session-id') ?? null,
  })

  if (logError) {
    console.error('Audit log error:', logError)
    // No fallar la respuesta — auditoría no debe bloquear al usuario
    return new Response(
      JSON.stringify({ success: false, error: logError.message }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )
  }

  return new Response(
    JSON.stringify({ success: true, log_id }),
    { status: 201, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
  )
})
