/**
 * db-helpers.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Módulo centralizado de acceso a base de datos para Edge Functions.
 * Elimina duplicación de queries entre functions y tipifica exhaustivamente.
 *
 * Principios aplicados:
 * - Single Responsibility: cada función hace una sola cosa
 * - DRY: ninguna query se repite en las Edge Functions
 * - Fail-fast: errores claros en lugar de null silencioso
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ─── Tipos estrictos (sin any) ───────────────────────────────────────────────

export interface OrgContext {
  organization_id: string
  organization_name: string
  user_role: 'admin' | 'coordinator' | 'analyst' | 'viewer'
  permissions: string[]
  plan_slug: string
  subscription_status: string
  member_status: string
}

export interface Organization {
  id: string
  name: string
  slug: string
  plan: string
  status: string
  stripe_customer_id: string | null
  billing_email: string | null
  settings: Record<string, unknown>
  security_config: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface Plan {
  id: string
  name: string
  slug: string
  price_monthly: number
  price_yearly: number
  max_domains: number
  max_scans_per_month: number
  max_reports_per_month: number
  max_users: number
  enabled_services: string[]
  features: Record<string, unknown>
  stripe_price_id_monthly: string | null
  stripe_price_id_yearly: string | null
}

export interface Subscription {
  id: string
  organization_id: string
  plan_id: string
  status: string
  billing_cycle: string
  stripe_subscription_id: string | null
  current_period_start: string | null
  current_period_end: string | null
  plan: Plan
}

export interface PlanLimitResult {
  allowed: boolean
  current_usage: number
  plan_limit: number
  remaining: number
  plan_name: string
  upgrade_required: boolean
}

export type ResourceType = 'scan' | 'report' | 'domain' | 'user' | 'api_call'

// ─── Cliente singleton por invocación ────────────────────────────────────────

let _client: SupabaseClient | null = null

export function getServiceClient(): SupabaseClient {
  if (!_client) {
    const url = Deno.env.get('SUPABASE_URL')
    const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!url || !key) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    _client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  }
  return _client
}

// ─── Queries reutilizables ────────────────────────────────────────────────────

/**
 * Obtiene el contexto completo de organización del usuario.
 * Una sola llamada RPC en lugar de múltiples queries secuenciales.
 */
export async function getUserOrgContext(
  supabase: SupabaseClient,
  userId: string
): Promise<OrgContext | null> {
  const { data, error } = await supabase
    .rpc('get_user_organization_context', { user_uuid: userId })

  if (error || !data || data.length === 0) return null
  return data[0] as OrgContext
}

/**
 * Obtiene organización con su suscripción activa en una sola query.
 * Evita el N+1 de cargar org y luego suscripción por separado.
 */
export async function getOrgWithSubscription(
  supabase: SupabaseClient,
  orgId: string
): Promise<{ organization: Organization; subscription: Subscription | null }> {
  const [orgResult, subResult] = await Promise.all([
    supabase.from('organizations').select('*').eq('id', orgId).single(),
    supabase
      .from('subscriptions')
      .select('*, plan:plans(*)')
      .eq('organization_id', orgId)
      .eq('status', 'active')
      .maybeSingle(),
  ])

  if (orgResult.error || !orgResult.data) {
    throw new Error(`Organization not found: ${orgResult.error?.message}`)
  }

  return {
    organization: orgResult.data as Organization,
    subscription:  subResult.data as Subscription | null,
  }
}

/**
 * Verifica límites del plan con una sola query SQL optimizada.
 * Reemplaza la lógica duplicada en múltiples Edge Functions.
 */
export async function checkPlanLimit(
  supabase: SupabaseClient,
  orgId: string,
  resourceType: ResourceType
): Promise<PlanLimitResult> {
  // Una sola query que obtiene uso actual Y límite del plan
  const { data, error } = await supabase.rpc('check_plan_limit', {
    org_id: orgId,
    resource_type: resourceType,
    quantity: 1,
  })

  if (error) throw new Error(`Failed to check plan limits: ${error.message}`)

  const result = data?.[0]
  if (!result) {
    // Sin suscripción activa — usar límites del plan free
    return { allowed: true, current_usage: 0, plan_limit: 5, remaining: 5, plan_name: 'Free', upgrade_required: false }
  }

  return result as PlanLimitResult
}

/**
 * Registra un evento de auditoría de forma segura (fire-and-forget).
 * No lanza excepciones — la auditoría nunca debe interrumpir la operación.
 */
export async function auditLog(
  supabase: SupabaseClient,
  params: {
    userId: string
    orgId: string
    action: string
    resourceType: string
    resourceId?: string
    result?: 'success' | 'failure' | 'denied'
    severity?: 'info' | 'warning' | 'critical'
    category?: 'auth' | 'data' | 'security' | 'billing' | 'admin' | 'system'
    metadata?: Record<string, unknown>
    ipAddress?: string
    userAgent?: string
  }
): Promise<void> {
  try {
    await supabase.rpc('log_audit_event', {
      p_user_id:       params.userId,
      p_org_id:        params.orgId,
      p_action:        params.action,
      p_resource_type: params.resourceType,
      p_resource_id:   params.resourceId ?? null,
      p_result:        params.result ?? 'success',
      p_severity:      params.severity ?? 'info',
      p_category:      params.category ?? 'system',
      p_metadata:      params.metadata ?? {},
      p_ip_address:    params.ipAddress ?? null,
      p_user_agent:    params.userAgent ?? null,
    })
  } catch (err) {
    console.error('[audit] failed to log event:', err)
  }
}

/**
 * Registra uso de recursos (scans, reportes, etc.).
 */
export async function recordUsage(
  supabase: SupabaseClient,
  orgId: string,
  resourceType: ResourceType,
  quantity = 1,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  try {
    await supabase.from('usage_records').insert({
      organization_id: orgId,
      resource_type:   resourceType,
      quantity,
      metadata,
      recorded_at:     new Date().toISOString(),
    })
  } catch (err) {
    console.error('[usage] failed to record:', err)
  }
}

/**
 * Helper para construir respuestas de error estandarizadas.
 */
export function errorResponse(
  message: string,
  status: number,
  details?: Record<string, unknown>
): Response {
  return new Response(
    JSON.stringify({ error: message, ...details }),
    { status, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
  )
}

/**
 * Helper para respuestas de éxito estandarizadas.
 */
export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(
    JSON.stringify(data),
    { status, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
  )
}
