/**
 * CoordinatorDashboard
 * Vista del Coordinador — gestiona dominios, ejecuta servicios y genera reportes.
 */

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Shield, Globe, Play, FileText,
  Plus, ChevronRight, LogOut, BarChart3,
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { ROLE_LABELS } from '../../types/cas'
import { DomainManager } from './DomainManager'

type CoordTab = 'overview' | 'domains' | 'services' | 'reports'

const TABS = [
  { id: 'overview', label: 'Resumen',   icon: BarChart3 },
  { id: 'domains',  label: 'Dominios',  icon: Globe     },
  { id: 'services', label: 'Servicios', icon: Play      },
  { id: 'reports',  label: 'Reportes',  icon: FileText  },
] as const

export function CoordinatorDashboard() {
  const { user, organization, signOut } = useAuth()
  const [tab, setTab] = useState<CoordTab>('overview')

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-black to-gray-900 flex">

      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 border-r border-white/10 flex flex-col">
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <Shield className="text-cyan-400 w-7 h-7" />
            <span className="font-bold text-white text-lg">Cuban CAS</span>
          </div>
          <div className="mt-3 px-2 py-1 rounded-lg bg-purple-500/10 border border-purple-500/20 inline-flex items-center gap-1.5">
            <Globe className="w-3 h-3 text-purple-400" />
            <span className="text-xs text-purple-400 font-medium">{ROLE_LABELS['coordinator']}</span>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as CoordTab)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                tab === t.id
                  ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-xs font-bold text-white">
              {user?.full_name?.[0] ?? 'C'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white truncate">{user?.full_name ?? 'Coordinador'}</p>
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

        {tab === 'overview' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <h1 className="text-2xl font-bold text-white">Panel del Coordinador</h1>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { label: 'Dominios activos',    value: '—', icon: Globe,     color: 'purple' },
                { label: 'Escaneos este mes',   value: '—', icon: Play,      color: 'cyan'   },
                { label: 'Reportes generados',  value: '—', icon: FileText,  color: 'blue'   },
              ].map(c => (
                <div key={c.label} className="bg-white/5 border border-white/10 rounded-2xl p-5">
                  <c.icon className={`w-5 h-5 text-${c.color}-400 mb-3`} />
                  <p className="text-2xl font-bold text-white">{c.value}</p>
                  <p className="text-xs text-gray-400 mt-1">{c.label}</p>
                </div>
              ))}
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h2 className="text-white font-semibold mb-4">Acciones disponibles</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { label: 'Agregar dominio',   icon: Plus,      tab: 'domains'  },
                  { label: 'Ejecutar servicio', icon: Play,      tab: 'services' },
                  { label: 'Generar reporte',   icon: FileText,  tab: 'reports'  },
                ].map(a => (
                  <button key={a.label} onClick={() => setTab(a.tab as CoordTab)}
                    className="flex items-center justify-between p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-purple-500/30 transition-all group">
                    <div className="flex items-center gap-3">
                      <a.icon className="w-4 h-4 text-purple-400" />
                      <span className="text-sm text-gray-300">{a.label}</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-purple-400 transition-colors" />
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {tab === 'domains' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <DomainManager />
          </motion.div>
        )}

        {tab === 'services' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <h1 className="text-2xl font-bold text-white">Servicios de Seguridad</h1>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { name: 'Protección Perimetral', type: 'perimeter',      desc: 'WAF, DDoS y SSL con Cloudflare',           color: 'cyan'   },
                { name: 'Escaneo de Vulnerab.',  type: 'vulnerability',  desc: 'Detección de vulnerabilidades conocidas',   color: 'red'    },
                { name: 'Prueba de Rendimiento', type: 'performance',    desc: 'Carga y tiempo de respuesta',               color: 'yellow' },
                { name: 'Prueba de Seguridad',   type: 'security',       desc: 'Suite OWASP Top 10',                        color: 'purple' },
                { name: 'Escaneo de Compliance', type: 'compliance',     desc: 'PCI, GDPR y normativas',                    color: 'blue'   },
              ].map(s => (
                <div key={s.type} className={`bg-white/5 border border-${s.color}-500/20 rounded-2xl p-5`}>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-white font-medium">{s.name}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full bg-${s.color}-500/10 text-${s.color}-400`}>{s.type}</span>
                  </div>
                  <p className="text-sm text-gray-400 mb-4">{s.desc}</p>
                  <button className={`flex items-center gap-2 px-3 py-1.5 rounded-lg bg-${s.color}-500/10 border border-${s.color}-500/20 text-${s.color}-400 text-xs hover:bg-${s.color}-500/20 transition-colors`}>
                    <Play className="w-3 h-3" />
                    Ejecutar
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {tab === 'reports' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-white">Reportes</h1>
              <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500/20 border border-blue-500/30 text-blue-400 text-sm hover:bg-blue-500/30 transition-colors">
                <Plus className="w-4 h-4" />
                Generar reporte con IA
              </button>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <div className="flex items-center justify-center py-12 text-gray-600">
                <div className="text-center">
                  <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No hay reportes generados</p>
                  <p className="text-xs mt-1">Selecciona un dominio y tipo de reporte para comenzar</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </main>
    </div>
  )
}
