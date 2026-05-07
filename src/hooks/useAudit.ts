/**
 * useAudit
 * ─────────────────────────────────────────────────────────────────────────────
 * Hook para registrar acciones críticas desde el frontend.
 * Implementa "Audit Everything": cada acción relevante queda registrada
 * con contexto suficiente para reconstruir qué pasó, quién y cuándo.
 *
 * Principios:
 * - Fire-and-forget: nunca bloquea la operación principal
 * - Enriquecimiento automático: agrega user_id, org_id, timestamp
 * - Tipado estricto: solo acciones predefinidas son válidas
 *
 * Uso:
 *   const { log, logSuccess, logFailure, logDenied } = useAudit()
 *
 *   // Acción exitosa
 *   await logSuccess('domain_created', 'domain', domainId, { domain: 'example.com' })
 *
 *   // Acción fallida
 *   await logFailure('scan_started', 'scan', undefined, { reason: error.message })
 *
 *   // Acceso denegado
 *   await logDenied('manage_billing', 'subscription')
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useAuth } from '../contexts/AuthContext'

// ─── Supabase client ──────────────────────────────────────────────────────────
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || '',
  import.meta.env.VITE_SUPABASE_ANON_KEY || ''
)

// ─── Tipos de acciones auditables ─────────────────────────────────────────────
export type AuditAction =
  // Auth
  | 'user_login'
  | 'user_logout'
  | 'user_register'
  | 'password_reset_requested'
  | 'password_changed'
  | 'session_expired'
  // Datos
  | 'domain_created'
  | 'domain_updated'
  | 'domain_deleted'
  | 'report_generated'
  | 'report_downloaded'
  | 'report_deleted'
  // Seguridad
  | 'scan_started'
  | 'scan_completed'
  | 'scan_failed'
  | 'scan_canceled'
  // Admin
  | 'member_invited'
  | 'member_role_changed'
  | 'member_removed'
  | 'organization_settings_updated'
  // Billing
  | 'subscription_upgraded'
  | 'subscription_canceled'
  | 'checkout_started'
  | 'checkout_completed'
  // Control de acceso
  | 'permission_denied'
  | 'plan_limit_reached'
  | 'suspicious_activity_detected'

export type AuditResult = 'success' | 'failure' | 'denied'

export interface AuditEventOptions {
  resourceId?: string
  metadata?: Record<string, unknown>
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useAudit() {
  const { user, organization, membership } = useAuth()

  /**
   * Registra un evento de auditoría.
   * Fire-and-forget: no lanza excepciones al caller.
   */
  const log = useCallback(async (
    action:       AuditAction,
    resourceType: string,
    result:       AuditResult = 'success',
    options:      AuditEventOptions = {}
  ): Promise<void> => {
    // Sin usuario autenticado no hay nada que registrar
    if (!user || !organization) return

    try {
      const session = await supabase.auth.getSession()
      const token   = session.data.session?.access_token
      if (!token) return

      // Llamar a la Edge Function — no await para no bloquear
      fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/audit-log`, {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          action,
          resource_type: resourceType,
          resource_id:   options.resourceId,
          result,
          metadata: {
            ...options.metadata,
            user_role:         membership?.role,
            organization_name: organization.name,
            plan:              organization.plan,
            timestamp:         new Date().toISOString(),
          },
        }),
      }).catch(err => {
        // Silenciar errores de red — auditoría no debe interrumpir UX
        console.warn('[audit] failed to send event:', action, err)
      })
    } catch (err) {
      console.warn('[audit] unexpected error:', err)
    }
  }, [user, organization, membership])

  /** Registra una acción exitosa */
  const logSuccess = useCallback((
    action:       AuditAction,
    resourceType: string,
    resourceId?:  string,
    metadata?:    Record<string, unknown>
  ) => log(action, resourceType, 'success', { resourceId, metadata }),
  [log])

  /** Registra una acción fallida */
  const logFailure = useCallback((
    action:       AuditAction,
    resourceType: string,
    resourceId?:  string,
    metadata?:    Record<string, unknown>
  ) => log(action, resourceType, 'failure', { resourceId, metadata }),
  [log])

  /** Registra un acceso denegado */
  const logDenied = useCallback((
    action:       AuditAction,
    resourceType: string,
    resourceId?:  string,
    metadata?:    Record<string, unknown>
  ) => log(action, resourceType, 'denied', { resourceId, metadata }),
  [log])

  /**
   * Envuelve una función async y registra su resultado automáticamente.
   * Útil para operaciones críticas donde siempre se debe auditar.
   *
   * Uso:
   *   const result = await withAudit(
   *     'domain_deleted', 'domain', domainId,
   *     () => deleteDomain(domainId)
   *   )
   */
  const withAudit = useCallback(async <T>(
    action:       AuditAction,
    resourceType: string,
    resourceId:   string | undefined,
    fn:           () => Promise<T>,
    metadata?:    Record<string, unknown>
  ): Promise<T> => {
    try {
      const result = await fn()
      logSuccess(action, resourceType, resourceId, metadata)
      return result
    } catch (err: any) {
      logFailure(action, resourceType, resourceId, {
        ...metadata,
        error: err?.message ?? String(err),
      })
      throw err
    }
  }, [logSuccess, logFailure])

  return {
    log,
    logSuccess,
    logFailure,
    logDenied,
    withAudit,
  }
}
