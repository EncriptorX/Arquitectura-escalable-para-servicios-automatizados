/**
 * ViewerDashboard
 * Vista del Visualizador — solo lectura de reportes e historial.
 * Sin capacidad de ejecutar acciones.
 */

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Shield, FileText, Eye, Clock,
  Download, Filter, LogOut, BarChart3, Globe,
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { ROLE_LABELS } from '../../types/cas'

type ViewerTab = 'reports' | 'history'

const TABS = [
  { id: 'reports', label: 'Reportes',  icon: FileText },
  { id: 'history', label: 'Historial', icon: Clock    },
] as const

export function ViewerDashboard() {
  const { user, organization, signOut } = useAuth()
  const [tab, setTab] = useState<ViewerTab>('reports')

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-black to-gray-900 flex">

      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 border-r border-white/10 flex flex-col">
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <Shield className="text-cyan-400 w-7 h-7" />
            <span className="font-bold text-white text-lg">Cuban CAS</span>
          </div>
          <div className="mt-3 px-2 py-1 rounded-lg bg-gray-500/10 border border-gray-500/20 inline-flex items-center gap-1.5">
            <Eye className="w-3 h-3 text-gray-400" />
            <span className="text-xs text-gray-400 font-medium">{ROLE_LABELS['viewer']}</span>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id as ViewerTab)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                tab === t.id
                  ? 'bg-white/10 text-white border border-white/20'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}>
              <t.icon className="w-4 h-4" />
              {t.label}
            </button>
          ))}
        </nav>

        {/* Acceso limitado */}
        <div className="mx-4 mb-4 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
          <div className="flex items-center gap-2 mb-1">
            <Eye className="w-3.5 h-3.5 text-yellow-400" />
            <span className="text-xs text-yellow-400 font-medium">Modo lectura</span>
          </div>
          <p className="text-xs text-gray-400">Solo puedes visualizar reportes e historial.</p>
        </div>

        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-500 to-gray-700 flex items-center justify-center text-xs font-bold text-white">
              {user?.full_name?.[0] ?? 'V'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white truncate">{user?.full_name ?? 'Visualizador'}</p>
              <p className="text-xs text-gray-500 truncate">{organization?.name}</p>
            </div>
          </div>
          <button onClick={signOut} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all">
            <LogOut className="w-3.5 h-3.5" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto p-8">

        {tab === 'reports' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-white">Reportes</h1>
                <p className="text-gray-400 text-sm mt-1">Visualiza los reportes generados por tu organización</p>
              </div>
              <div className="flex items-center gap-2">
                <button className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-400 text-sm hover:text-white transition-colors">
                  <Filter className="w-4 h-4" />
                  Filtrar
                </button>
              </div>
            </div>

            {/* Tipos de reporte disponibles */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Seguridad',        color: 'cyan'   },
                { label: 'Vulnerabilidades', color: 'red'    },
                { label: 'Rendimiento',      color: 'yellow' },
                { label: 'Compliance',       color: 'green'  },
              ].map(t => (
                <div key={t.label} className={`p-3 rounded-xl bg-${t.color}-500/10 border border-${t.color}-500/20 text-center`}>
                  <p className={`text-xs font-medium text-${t.color}-400`}>{t.label}</p>
                </div>
              ))}
            </div>

            {/* Lista de reportes */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <div className="flex items-center justify-center py-12 text-gray-600">
                <div className="text-center">
                  <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No hay reportes disponibles</p>
                  <p className="text-xs mt-1 text-gray-600">Los reportes generados por tu organización aparecerán aquí</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {tab === 'history' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-white">Historial de Ejecuciones</h1>
              <p className="text-gray-400 text-sm mt-1">Registro de todos los escaneos ejecutados en tu organización</p>
            </div>

            {/* Filtros */}
            <div className="flex flex-wrap gap-2">
              {['Todos', 'Completados', 'Fallidos', 'En curso'].map(f => (
                <button key={f} className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-gray-400 hover:text-white hover:border-white/20 transition-colors">
                  {f}
                </button>
              ))}
            </div>

            {/* Lista */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <div className="flex items-center justify-center py-12 text-gray-600">
                <div className="text-center">
                  <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Sin ejecuciones registradas</p>
                  <p className="text-xs mt-1 text-gray-600">El historial de escaneos aparecerá aquí</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </main>
    </div>
  )
}
