/**
 * AnalystDashboard
 * Vista del Analista — ejecuta escaneos y genera reportes.
 * Sin acceso a funciones administrativas ni gestión de dominios.
 */

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Shield, Play, FileText, Search,
  AlertTriangle, CheckCircle, Clock, LogOut, BarChart3,
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { ROLE_LABELS } from '../../types/cas'

type AnalystTab = 'overview' | 'scans' | 'reports'

const TABS = [
  { id: 'overview', label: 'Resumen',  icon: BarChart3 },
  { id: 'scans',    label: 'Escaneos', icon: Play      },
  { id: 'reports',  label: 'Reportes', icon: FileText  },
] as const

const SCAN_TYPES = [
  { name: 'Escaneo de Vulnerabilidades', icon: AlertTriangle, color: 'red',    desc: 'Detecta CVEs y vectores de ataque' },
  { name: 'Prueba de Rendimiento',       icon: Clock,         color: 'yellow', desc: 'Latencia, throughput y errores'     },
  { name: 'Prueba de Seguridad',         icon: Shield,        color: 'blue',   desc: 'OWASP Top 10 automatizado'          },
]

export function AnalystDashboard() {
  const { user, organization, signOut } = useAuth()
  const [tab, setTab] = useState<AnalystTab>('overview')

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-black to-gray-900 flex">

      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 border-r border-white/10 flex flex-col">
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <Shield className="text-cyan-400 w-7 h-7" />
            <span className="font-bold text-white text-lg">Cuban CAS</span>
          </div>
          <div className="mt-3 px-2 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 inline-flex items-center gap-1.5">
            <Search className="w-3 h-3 text-blue-400" />
            <span className="text-xs text-blue-400 font-medium">{ROLE_LABELS['analyst']}</span>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id as AnalystTab)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                tab === t.id
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}>
              <t.icon className="w-4 h-4" />
              {t.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center text-xs font-bold text-white">
              {user?.full_name?.[0] ?? 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white truncate">{user?.full_name ?? 'Analista'}</p>
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
            <h1 className="text-2xl font-bold text-white">Panel del Analista</h1>

            {/* Capacidades */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h2 className="text-white font-semibold mb-4">Tus capacidades</h2>
              <div className="space-y-3">
                {[
                  { icon: CheckCircle, text: 'Ejecutar escaneos sobre dominios registrados',  color: 'green' },
                  { icon: CheckCircle, text: 'Generar reportes de seguridad con IA',           color: 'green' },
                  { icon: CheckCircle, text: 'Visualizar reportes e historial de ejecuciones', color: 'green' },
                  { icon: AlertTriangle, text: 'Sin acceso a gestión de dominios ni usuarios', color: 'yellow' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <item.icon className={`w-4 h-4 text-${item.color}-400 flex-shrink-0`} />
                    <span className="text-sm text-gray-300">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { label: 'Escaneos ejecutados', value: '—', icon: Play,     color: 'blue'  },
                { label: 'Reportes generados',  value: '—', icon: FileText, color: 'cyan'  },
              ].map(c => (
                <div key={c.label} className="bg-white/5 border border-white/10 rounded-2xl p-5">
                  <c.icon className={`w-5 h-5 text-${c.color}-400 mb-3`} />
                  <p className="text-2xl font-bold text-white">{c.value}</p>
                  <p className="text-xs text-gray-400 mt-1">{c.label}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {tab === 'scans' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <h1 className="text-2xl font-bold text-white">Ejecutar Escaneo</h1>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Seleccionar dominio</label>
                <select className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500/50">
                  <option value="">-- Selecciona un dominio --</option>
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {SCAN_TYPES.map(s => (
                  <button key={s.name} className={`p-4 rounded-xl bg-${s.color}-500/10 border border-${s.color}-500/20 hover:bg-${s.color}-500/20 transition-all text-left`}>
                    <s.icon className={`w-5 h-5 text-${s.color}-400 mb-2`} />
                    <p className="text-white text-sm font-medium">{s.name}</p>
                    <p className="text-gray-400 text-xs mt-1">{s.desc}</p>
                    <div className={`mt-3 flex items-center gap-1 text-xs text-${s.color}-400`}>
                      <Play className="w-3 h-3" />
                      Ejecutar
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Historial */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h2 className="text-white font-semibold mb-4">Historial de Ejecuciones</h2>
              <div className="flex items-center justify-center py-8 text-gray-600">
                <div className="text-center">
                  <Clock className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Sin ejecuciones recientes</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {tab === 'reports' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <h1 className="text-2xl font-bold text-white">Reportes</h1>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Dominio</label>
                  <select className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500/50">
                    <option value="">-- Selecciona dominio --</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Tipo de reporte</label>
                  <select className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500/50">
                    <option value="security">Seguridad</option>
                    <option value="vulnerability">Vulnerabilidades</option>
                    <option value="performance">Rendimiento</option>
                    <option value="comprehensive">Completo</option>
                  </select>
                </div>
              </div>
              <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500/20 border border-blue-500/30 text-blue-400 text-sm hover:bg-blue-500/30 transition-colors">
                <FileText className="w-4 h-4" />
                Generar con IA
              </button>
            </div>
          </motion.div>
        )}
      </main>
    </div>
  )
}
