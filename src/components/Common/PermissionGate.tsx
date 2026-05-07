/**
 * PermissionGate
 * ─────────────────────────────────────────────────────────────────────────────
 * Componente que implementa Least Privilege en la UI.
 * Renderiza sus hijos SOLO si el usuario tiene los permisos requeridos.
 * Si no los tiene, muestra un fallback o nada.
 *
 * Uso:
 *   // Requiere permiso específico
 *   <PermissionGate permission="execute_scans">
 *     <ScanButton />
 *   </PermissionGate>
 *
 *   // Requiere rol mínimo
 *   <PermissionGate minRole="manager">
 *     <UserManagement />
 *   </PermissionGate>
 *
 *   // Con fallback personalizado
 *   <PermissionGate permission="manage_billing" fallback={<UpgradePrompt />}>
 *     <BillingPanel />
 *   </PermissionGate>
 *
 *   // Requiere todos los permisos
 *   <PermissionGate permissions={['manage_domains', 'execute_scans']}>
 *     <AdvancedPanel />
 *   </PermissionGate>
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { type ReactNode } from 'react'
import { Lock, ArrowUpCircle } from 'lucide-react'
import { useLeastPrivilege } from '../../hooks/useLeastPrivilege'
import type { Permission, UserRole } from '../../types/cas'

// ─── Props ────────────────────────────────────────────────────────────────────
interface PermissionGateProps {
  children: ReactNode

  /** Permiso único requerido */
  permission?: Permission

  /** Múltiples permisos requeridos (todos) */
  permissions?: Permission[]

  /** Al menos uno de estos permisos */
  anyPermission?: Permission[]

  /** Rol mínimo requerido en la jerarquía */
  minRole?: UserRole

  /** Característica de plan requerida */
  requiredFeature?: string

  /**
   * Qué mostrar si no tiene acceso:
   * - undefined / null: no renderiza nada (default)
   * - 'locked': muestra icono de candado con mensaje
   * - 'upgrade': muestra prompt de upgrade de plan
   * - ReactNode: componente personalizado
   */
  fallback?: 'locked' | 'upgrade' | ReactNode

  /** Clase CSS adicional para el wrapper del fallback */
  fallbackClassName?: string
}

// ─── Fallback: acceso denegado ────────────────────────────────────────────────
function LockedFallback({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-gray-500 text-sm ${className}`}>
      <Lock className="w-3.5 h-3.5 flex-shrink-0" />
      <span>Acceso restringido</span>
    </div>
  )
}

// ─── Fallback: upgrade de plan ────────────────────────────────────────────────
function UpgradeFallback({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-sm ${className}`}>
      <ArrowUpCircle className="w-3.5 h-3.5 flex-shrink-0" />
      <span>Disponible en planes superiores</span>
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────
export function PermissionGate({
  children,
  permission,
  permissions,
  anyPermission,
  minRole,
  requiredFeature,
  fallback,
  fallbackClassName = '',
}: PermissionGateProps) {
  const { can, canAll, canAny, isAtLeast, planIncludes } = useLeastPrivilege()

  // Evaluar acceso — todas las condiciones deben cumplirse
  const hasAccess = (() => {
    if (permission && !can(permission)) return false
    if (permissions?.length && !canAll(...permissions)) return false
    if (anyPermission?.length && !canAny(...anyPermission)) return false
    if (minRole && !isAtLeast(minRole)) return false
    if (requiredFeature && !planIncludes(requiredFeature)) return false
    return true
  })()

  if (hasAccess) return <>{children}</>

  // Sin acceso — mostrar fallback según configuración
  if (!fallback) return null

  if (fallback === 'locked') return <LockedFallback className={fallbackClassName} />
  if (fallback === 'upgrade') return <UpgradeFallback className={fallbackClassName} />
  return <>{fallback}</>
}

// ─── Variantes de conveniencia ────────────────────────────────────────────────

/** Solo para admins */
export function AdminOnly({ children, fallback }: { children: ReactNode; fallback?: PermissionGateProps['fallback'] }) {
  return <PermissionGate minRole="admin" fallback={fallback}>{children}</PermissionGate>
}

/** Para managers y admins */
export function ManagerOnly({ children, fallback }: { children: ReactNode; fallback?: PermissionGateProps['fallback'] }) {
  return <PermissionGate minRole="manager" fallback={fallback}>{children}</PermissionGate>
}

/** Para analysts, managers y admins */
export function AnalystOnly({ children, fallback }: { children: ReactNode; fallback?: PermissionGateProps['fallback'] }) {
  return <PermissionGate minRole="analyst" fallback={fallback}>{children}</PermissionGate>
}

/** Para cualquier miembro autenticado (viewer en adelante) */
export function MemberOnly({ children, fallback }: { children: ReactNode; fallback?: PermissionGateProps['fallback'] }) {
  return <PermissionGate minRole="viewer" fallback={fallback}>{children}</PermissionGate>
}
