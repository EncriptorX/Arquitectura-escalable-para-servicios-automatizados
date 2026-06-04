/**
 * useLeastPrivilege
 * ─────────────────────────────────────────────────────────────────────────────
 * Implementa el Principio de Mínimo Privilegio (Least Privilege) a nivel de
 * aplicación.
 *
 * Jerarquía de roles:
 *   viewer < analyst < coordinator < admin
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useMemo } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { PERMISSIONS, ROLE_PERMISSIONS, type Permission, type UserRole } from '../types/cas'

// Jerarquía de roles
const ROLE_HIERARCHY: UserRole[] = ['viewer', 'analyst', 'coordinator', 'admin']

export const PERMISSION_REQUIREMENTS: Record<Permission, UserRole> = {
  [PERMISSIONS.VIEW_DOMAINS]:           'viewer',
  [PERMISSIONS.VIEW_REPORTS]:           'viewer',
  [PERMISSIONS.EXECUTE_SCANS]:          'analyst',
  [PERMISSIONS.GENERATE_REPORTS]:       'analyst',
  [PERMISSIONS.MANAGE_DOMAINS]:         'coordinator',
  [PERMISSIONS.MANAGE_SERVICES]:        'coordinator',
  [PERMISSIONS.MANAGE_NOTIFICATIONS]:   'coordinator',
  [PERMISSIONS.MANAGE_ORGANIZATION]:    'admin',
  [PERMISSIONS.MANAGE_USERS]:           'admin',
  [PERMISSIONS.MANAGE_BILLING]:         'admin',
  [PERMISSIONS.VIEW_AUDIT_LOGS]:        'admin',
}

export function useLeastPrivilege() {
  const { membership, subscription, organization } = useAuth()

  const role = membership?.role ?? null
  const plan = organization?.plan ?? 'free'

  const effectivePermissions = useMemo<Permission[]>(() => {
    if (!role) return []
    return ROLE_PERMISSIONS[role] ?? []
  }, [role])

  const can = (permission: Permission): boolean => {
    if (!membership || membership.status !== 'active') return false
    if (role === 'admin') return true
    return effectivePermissions.includes(permission)
  }

  const canAny = (...permissions: Permission[]): boolean =>
    permissions.some(p => can(p))

  const canAll = (...permissions: Permission[]): boolean =>
    permissions.every(p => can(p))

  const isAtLeast = (minRole: UserRole): boolean => {
    if (!role) return false
    return ROLE_HIERARCHY.indexOf(role) >= ROLE_HIERARCHY.indexOf(minRole)
  }

  const hasExactRole = (targetRole: UserRole): boolean => role === targetRole

  const planIncludes = (feature: string): boolean => {
    if (!subscription || subscription.status !== 'active') {
      return plan === 'free' && feature === 'basic_scan'
    }
    const enabledServices = (subscription.plan as any)?.enabled_services ?? []
    return enabledServices.includes(feature)
  }

  const canWithPlan = (permission: Permission, requiredFeature?: string): boolean => {
    if (!can(permission)) return false
    if (requiredFeature && !planIncludes(requiredFeature)) return false
    return true
  }

  const missingPermissions = (...required: Permission[]): Permission[] =>
    required.filter(p => !can(p))

  const requiredRoleFor = (permission: Permission): UserRole =>
    PERMISSION_REQUIREMENTS[permission] ?? 'admin'

  return {
    role,
    plan,
    effectivePermissions,
    isAuthenticated: !!membership && membership.status === 'active',
    can, canAny, canAll, canWithPlan,
    isAtLeast, hasExactRole,
    isAdmin:       role === 'admin',
    isCoordinator: role === 'coordinator',
    isAnalyst:     role === 'analyst',
    isViewer:      role === 'viewer',
    planIncludes,
    missingPermissions,
    requiredRoleFor,
    PERMISSIONS,
    ROLE_HIERARCHY,
  }
}
