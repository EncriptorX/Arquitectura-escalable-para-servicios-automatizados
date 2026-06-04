/**
 * AdminDashboard
 * Vista del Administrador — acceso completo al sistema.
 * Gestiona organización, equipo y facturación.
 */

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Shield, Users, CreditCard, Settings, Globe,
  BarChart3, Bell, FileText, Key, AlertTriangle,
  ChevronRight, Building2, LogOut,
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { AuditLogViewer } from './AuditLogViewer'
import { ROLE_LABELS } from '../../types/cas'

type AdminTab = 'overview' | 'organization' | 'team' | 'billing' | 'audit'

const TABS = [
  { id: 'overview',      label: 'Resumen',        icon: BarChart3   },
  { id: 'organization',  label: 'Organización',   icon: Building2   },
  { id: 'team',          label: 'Equipo',          icon: Users       },
  { id: 'billing',       label: 'Facturación',     icon: CreditCard  },
  { id: 'audit',         label: 'Auditoría',       icon: Shield      },
] as const

export function AdminDashboard() {
  const { user, organization, membership, subscription, signOut } = useAuth()
  const [tab, setTab] = useState<AdminTab>('overview')

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-black to-gray-900 flex">

      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 border-r border-white/10 flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <Shield className="text-cyan-400 w-7 h-7" />
            <span className="font-bold text-white text-lg">Cuban CAS</span>
          </div>
          <div className="mt-3 px-2 py-1 rounded-lg bg-red-500/10 border border-red-500/20 inline-flex items-center gap-1.5">
            <Key className="w-3 h-3 text-red-400" />
            <span className="text-xs text-red-400 font-medium">{ROLE_LABELS['admin']}</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as AdminTab)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                tab === t.id
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
            </button>
          ))}
        </nav>

        {/* User info */}
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-xs font-bold text-white">
              {user?.full_name?.[0] ?? 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white truncate">{user?.full_name ?? 'Admin'}</p>
              <p className="text-xs text-gray-500 truncate">{organization?.name}</p>
            </div>
          </div>
          <button
            onClick={signOut}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
          >
            <LogOut className="w-3.5 h-3.5" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto p-8">

        {/* Overview */}
        {tab === 'overview' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <h1 className="text-2xl font-bold text-white">Panel del Administrador</h1>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Plan activo',     value: subscription?.plan?.name ?? organization?.plan ?? 'Free', icon: CreditCard, color: 'cyan'   },
                { label: 'Estado org.',     value: organization?.status ?? '—',                               icon: Building2,  color: 'green'  },
                { label: 'Acceso',          value: 'Completo',                                                 icon: Key,        color: 'red'    },
                { label: 'Notificaciones',  value: 'Activas',                                                  icon: Bell,       color: 'yellow' },
              ].map(card => (
                <div key={card.label} className="bg-white/5 border border-white/10 rounded-2xl p-5">
                  <card.icon className={`w-5 h-5 text-${card.color}-400 mb-3`} />
                  <p className="text-2xl font-bold text-white capitalize">{card.value}</p>
                  <p className="text-xs text-gray-400 mt-1">{card.label}</p>
                </div>
              ))}
            </div>

            {/* Acciones rápidas */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h2 className="text-white font-semibold mb-4">Acciones de Administrador</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { label: 'Gestionar organización', icon: Building2, tab: 'organization' },
                  { label: 'Administrar equipo',     icon: Users,     tab: 'team'         },
                  { label: 'Gestionar facturación',  icon: CreditCard,tab: 'billing'      },
                ].map(a => (
                  <button
                    key={a.label}
                    onClick={() => setTab(a.tab as AdminTab)}
                    className="flex items-center justify-between p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-cyan-500/30 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <a.icon className="w-4 h-4 text-cyan-400" />
                      <span className="text-sm text-gray-300">{a.label}</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-cyan-400 transition-colors" />
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Organización */}
        {tab === 'organization' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <h1 className="text-2xl font-bold text-white">Organización</h1>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { label: 'Nombre',   value: organization?.name  },
                  { label: 'Slug',     value: organization?.slug  },
                  { label: 'Plan',     value: organization?.plan  },
                  { label: 'Estado',   value: organization?.status },
                ].map(f => (
                  <div key={f.label} className="space-y-1">
                    <p className="text-xs text-gray-500">{f.label}</p>
                    <p className="text-white font-medium capitalize">{f.value ?? '—'}</p>
                  </div>
                ))}
              </div>
              <div className="pt-4 border-t border-white/10">
                <button className="px-4 py-2 rounded-xl bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 text-sm hover:bg-cyan-500/30 transition-colors flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Editar configuración
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Equipo */}
        {tab === 'team' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-white">Equipo</h1>
              <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 text-sm hover:bg-cyan-500/30 transition-colors">
                <Users className="w-4 h-4" />
                Invitar miembro
              </button>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <p className="text-sm text-gray-400 mb-4">Roles disponibles y sus capacidades:</p>
              <div className="space-y-3">
                {([
                  { role: 'admin',       color: 'red',    desc: 'Acceso completo — organización, equipo y facturación'      },
                  { role: 'coordinator', color: 'purple', desc: 'Gestiona dominios, ejecuta servicios y genera reportes'    },
                  { role: 'analyst',     color: 'blue',   desc: 'Ejecuta escaneos y genera reportes sobre dominios'         },
                  { role: 'viewer',      color: 'gray',   desc: 'Solo lectura de reportes e historial de ejecuciones'       },
                ] as const).map(r => (
                  <div key={r.role} className={`flex items-center gap-4 p-3 rounded-xl bg-${r.color}-500/10 border border-${r.color}-500/20`}>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full bg-${r.color}-500/20 text-${r.color}-400`}>
                      {ROLE_LABELS[r.role]}
                    </span>
                    <span className="text-sm text-gray-300">{r.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Facturación */}
        {tab === 'billing' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <h1 className="text-2xl font-bold text-white">Facturación</h1>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-semibold text-lg">{subscription?.plan?.name ?? 'Free'}</p>
                  <p className="text-gray-400 text-sm">Plan actual</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  subscription?.status === 'active'
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-yellow-500/20 text-yellow-400'
                }`}>
                  {subscription?.status ?? 'Sin suscripción'}
                </span>
              </div>
              <div className="pt-4 border-t border-white/10 flex gap-3">
                <button className="px-4 py-2 rounded-xl bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 text-sm hover:bg-cyan-500/30 transition-colors">
                  Cambiar plan
                </button>
                <button className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-300 text-sm hover:bg-white/10 transition-colors">
                  Ver facturas
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Auditoría */}
        {tab === 'audit' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <h1 className="text-2xl font-bold text-white">Registro de Auditoría</h1>
            <AuditLogViewer />
          </motion.div>
        )}
      </main>
    </div>
  )
}
