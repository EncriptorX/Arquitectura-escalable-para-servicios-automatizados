/**
 * useLeastPrivilege
 * ─────────────────────────────────────────────────────────────────────────────
 * Implementa el Principio de Mínimo Privilegio (Least Privilege) a nivel de
 * aplicación. Cada componente o acción solicita solo los permisos que necesita
 * y el hook verifica si el usuario los tiene, sin exponer permisos adicionales.
 *
 * Jerarquía de roles:
 *   viewer < analyst < manager < admin
 *
 * Uso:
 *   const { can, canAny, canAll, role, isAtLeast } = useLeastPrivilege()
 *   if (can('execute_scans')) { ... }
 *   if (isAtLeast('analyst')) { ... }
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useMemo } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { PERMISSIONS, ROLE_PERMISSIONS, type Permission, type UserRole } from '../types/cas'

// ─── Jerarquía de roles (menor índice = menos privilegio) ────────────────────
const ROLE_HIERARCHY: UserRole[] = ['viewer', 'analyst', 'manager', 'admin']

// ─── Permisos mínimos requeridos por acción ───────────────────────────────────
// Define explícitamente qué rol mínimo necesita cada permiso.
// Esto documenta y centraliza las decisiones de acceso.
export const PERMISSION_REQUIREMENTS: Record<Permission, UserRole> = {
  // Viewer puede ver dominios y reportes
  [PERMISSIONS.VIEW_DOMAINS]:           'viewer',
  [PERMISSIONS.VIEW_REPORTS]:           'viewer',

  // Analyst puede ejecutar y generar
  [PERMISSIONS.EXECUTE_SCANS]:          'analyst',
  [PERMISSIONS.GENERATE_REPORTS]:       'analyst',

  // Manager gestiona recursos y usuarios
  [PERMISSIONS.MANAGE_DOMAINS]:         'manager',
  [PERMISSIONS.MANAGE_SERVICES]:        'manager',
  [PERMISSIONS.MANAGE_USERS]:           'manager',
  [PERMISSIONS.MANAGE_NOTIFICATIONS]:   'manager',

  // Admin tiene control total
  [PERMISSIONS.MANAGE_ORGANIZATION]:    'admin',
  [PERMISSIONS.MANAGE_BILLING]:         'admin',
  [PERMISSIONS.VIEW_AUDIT_LOGS]:        'admin',
}

// ─── Hook principal ───────────────────────────────────────────────────────────
export function useLeastPrivilege() {
  const { membership, subscription, organization } = useAuth()

  const role = membership?.role ?? null
  const plan = organization?.plan ?? 'free'

  // Permisos efectivos del usuario según su rol
  const effectivePermissions = useMemo<Permission[]>(() => {
    if (!role) return []
    return ROLE_PERMISSIONS[role] ?? []
  }, [role])

  /**
   * Verifica si el usuario tiene un permiso específico.
   * Principio: solicitar solo el permiso necesario, no el rol completo.
   */
  const can = (permission: Permission): boolean => {
    if (!membership || membership.status !== 'active') return false
    if (role === 'admin') return true
    return effectivePermissions.includes(permission)
  }

  /**
   * Verifica si el usuario tiene AL MENOS UNO de los permisos dados.
   */
  const canAny = (...permissions: Permission[]): boolean => {
    return permissions.some(p => can(p))
  }

  /**
   * Verifica si el usuario tiene TODOS los permisos dados.
   */
  const canAll = (...permissions: Permission[]): boolean => {
    return permissions.every(p => can(p))
  }

  /**
   * Verifica si el usuario tiene al menos el rol mínimo requerido.
   * Usa la jerarquía: viewer < analyst < manager < admin
   */
  const isAtLeast = (minRole: UserRole): boolean => {
    if (!role) return false
    const userLevel = ROLE_HIERARCHY.indexOf(role)
    const minLevel  = ROLE_HIERARCHY.indexOf(minRole)
    return userLevel >= minLevel
  }

  /**
   * Verifica si el usuario tiene exactamente el rol dado.
   * Usar solo cuando se necesita un rol específico, no una jerarquía.
   */
  const hasExactRole = (targetRole: UserRole): boolean => {
    return role === targetRole
  }

  /**
   * Verifica si el plan activo incluye una característica.
   * Least Privilege a nivel de plan: no mostrar lo que no está disponible.
   */
  const planIncludes = (feature: string): boolean => {
    if (!subscription || subscription.status !== 'active') {
      // Plan free siempre activo
      return plan === 'free' && feature === 'basic_scan'
    }
    const enabledServices = (subscription.plan as any)?.enabled_services ?? []
    return enabledServices.includes(feature)
  }

  /**
   * Verifica si el usuario puede realizar una acción considerando
   * tanto su rol como el plan de la organización.
   * Esta es la verificación completa de Least Privilege.
   */
  const canWithPlan = (permission: Permission, requiredFeature?: string): boolean => {
    if (!can(permission)) return false
    if (requiredFeature && !planIncludes(requiredFeature)) return false
    return true
  }

  /**
   * Retorna los permisos que el usuario NO tiene.
   * Útil para mostrar qué necesita para acceder a una función.
   */
  const missingPermissions = (...required: Permission[]): Permission[] => {
    return required.filter(p => !can(p))
  }

  /**
   * Retorna el rol mínimo requerido para un permiso.
   * Útil para mensajes de "necesitas ser X para hacer esto".
   */
  const requiredRoleFor = (permission: Permission): UserRole => {
    return PERMISSION_REQUIREMENTS[permission] ?? 'admin'
  }

  return {
    // Estado
    role,
    plan,
    effectivePermissions,
    isAuthenticated: !!membership && membership.status === 'active',

    // Verificaciones de permiso
    can,
    canAny,
    canAll,
    canWithPlan,

    // Verificaciones de rol
    isAtLeast,
    hasExactRole,
    isAdmin:   role === 'admin',
    isManager: role === 'manager',
    isAnalyst: role === 'analyst',
    isViewer:  role === 'viewer',

    // Plan
    planIncludes,

    // Utilidades
    missingPermissions,
    requiredRoleFor,

    // Constantes exportadas para uso en componentes
    PERMISSIONS,
    ROLE_HIERARCHY,
  }
}
