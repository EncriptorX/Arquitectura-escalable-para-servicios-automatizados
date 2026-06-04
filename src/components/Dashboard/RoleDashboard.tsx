/**
 * RoleDashboard
 * Enruta al dashboard correcto según el rol del usuario autenticado.
 * Cada rol tiene su propia vista con acceso restringido a sus funciones.
 */

import { useAuth } from '../../contexts/AuthContext'
import { AdminDashboard }       from './AdminDashboard'
import { CoordinatorDashboard } from './CoordinatorDashboard'
import { AnalystDashboard }     from './AnalystDashboard'
import { ViewerDashboard }      from './ViewerDashboard'

export function RoleDashboard() {
  const { membership, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">Cargando panel...</p>
        </div>
      </div>
    )
  }

  if (!membership) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-gray-400 text-sm">Sin organización asignada. Contacta a tu administrador.</p>
      </div>
    )
  }

  switch (membership.role) {
    case 'admin':       return <AdminDashboard />
    case 'coordinator': return <CoordinatorDashboard />
    case 'analyst':     return <AnalystDashboard />
    case 'viewer':      return <ViewerDashboard />
    default:            return <ViewerDashboard />
  }
}
