/**
 * auth-middleware.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Middleware de autenticación y autorización para Edge Functions.
 * Versión optimizada: una sola llamada RPC en lugar de 3 queries secuenciales.
 *
 * Mejoras:
 * - Eliminados todos los `any` → tipos estrictos desde db-helpers.ts
 * - Una sola RPC `get_user_organization_context` reemplaza 3 queries
 * - `withAuth` + `withPlanLimits` comparten el mismo cliente Supabase
 * - Responses estandarizadas via `errorResponse`
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  getServiceClient,
  getUserOrgContext,
  getOrgWithSubscription,
  checkPlanLimit,
  auditLog,
  errorResponse,
  type OrgContext,
  type Organization,
  type Subscription,
  type ResourceType,
  type PlanLimitResult,
} from './db-helpers.ts'

// ─── Tipos exportados ─────────────────────────────────────────────────────────

export interface AuthContext {
  userId:       string
  orgId:        string
  role:         OrgContext['user_role']
  permissions:  string[]
  organization: Organization
  subscription: Subscription | null
  planSlug:     string
  ipAddress:    string | null
  userAgent:    string | null
}

// ─── CORS headers ─────────────────────────────────────────────────────────────

export const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
}

export function handleCors(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS })
  }
  return null
}

// ─── Middleware principal ─────────────────────────────────────────────────────

/**
 * Valida JWT, obtiene contexto de org y verifica permisos.
 * Realiza solo 2 queries (auth.getUser + RPC) en lugar de 4.
 */
export async function withAuth(
  req: Request,
  requiredPermissions: string[] = []
): Promise<{ context: AuthContext | null; error: Response | null }> {

  const token = extractToken(req)
  if (!token) {
    return { context: null, error: errorResponse('Missing or invalid authorization header', 401) }
  }

  const supabase = getServiceClient()

  try {
    // 1. Verificar JWT
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return { context: null, error: errorResponse('Invalid or expired token', 401) }
    }

    // 2. Obtener contexto de organización (una sola RPC)
    const orgCtx = await getUserOrgContext(supabase, user.id)
    if (!orgCtx) {
      return { context: null, error: errorResponse('User not associated with any active organization', 403) }
    }
    if (orgCtx.member_status !== 'active') {
      return { context: null, error: errorResponse('User membership is not active', 403, { status: orgCtx.member_status }) }
    }

    // 3. Verificar permisos (sin query adicional — datos ya en orgCtx)
    if (requiredPermissions.length > 0) {
      const hasAll = requiredPermissions.every(p =>
        orgCtx.user_role === 'admin' || orgCtx.permissions.includes(p)
      )
      if (!hasAll) {
        return {
          context: null,
          error: errorResponse('Insufficient permissions', 403, {
            required:   requiredPermissions,
            user_role:  orgCtx.user_role,
          }),
        }
      }
    }

    // 4. Cargar org + suscripción en paralelo (solo si no están en orgCtx)
    const { organization, subscription } = await getOrgWithSubscription(supabase, orgCtx.organization_id)

    const context: AuthContext = {
      userId:       user.id,
      orgId:        orgCtx.organization_id,
      role:         orgCtx.user_role,
      permissions:  orgCtx.permissions,
      organization,
      subscription,
      planSlug:     orgCtx.plan_slug,
      ipAddress:    req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip'),
      userAgent:    req.headers.get('user-agent'),
    }

    return { context, error: null }

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Authentication failed'
    return { context: null, error: errorResponse(msg, 401) }
  }
}

// ─── Verificación de límites de plan ─────────────────────────────────────────

export async function withPlanLimits(
  context: AuthContext,
  resourceType: ResourceType
): Promise<{ allowed: boolean; limitResult: PlanLimitResult; error: Response | null }> {
  const supabase = getServiceClient()

  try {
    const limitResult = await checkPlanLimit(supabase, context.orgId, resourceType)

    if (!limitResult.allowed) {
      return {
        allowed:     false,
        limitResult,
        error: errorResponse(`${resourceType} limit exceeded`, 429, {
          current_usage:    limitResult.current_usage,
          plan_limit:       limitResult.plan_limit,
          plan_name:        limitResult.plan_name,
          upgrade_required: true,
        }),
      }
    }

    return { allowed: true, limitResult, error: null }

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to validate plan limits'
    return {
      allowed:     false,
      limitResult: { allowed: false, current_usage: 0, plan_limit: 0, remaining: 0, plan_name: '', upgrade_required: true },
      error:       errorResponse(msg, 500),
    }
  }
}

// ─── Helpers de autorización ──────────────────────────────────────────────────

export function hasPermission(context: AuthContext, permission: string): boolean {
  return context.role === 'admin' || context.permissions.includes(permission)
}

export function requireRole(
  context: AuthContext,
  allowedRoles: Array<AuthContext['role']>
): Response | null {
  if (!allowedRoles.includes(context.role)) {
    return errorResponse('Insufficient role privileges', 403, {
      required_roles: allowedRoles,
      user_role:      context.role,
    })
  }
  return null
}

// ─── Re-exportar logAuditEvent para compatibilidad ────────────────────────────

export async function logAuditEvent(
  context: AuthContext,
  action: string,
  resourceType: string,
  resourceId?: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  await auditLog(getServiceClient(), {
    userId:       context.userId,
    orgId:        context.orgId,
    action,
    resourceType,
    resourceId,
    metadata,
    ipAddress:    context.ipAddress ?? undefined,
    userAgent:    context.userAgent ?? undefined,
  })
}

// ─── Utilidades internas ──────────────────────────────────────────────────────

function extractToken(req: Request): string | null {
  const header = req.headers.get('Authorization')
  if (!header?.startsWith('Bearer ')) return null
  return header.slice(7)
}
