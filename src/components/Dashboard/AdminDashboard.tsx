/**
 * AdminDashboard
 * Vista del Administrador — acceso completo al sistema.
 * Gestiona organización, equipo y facturación.
 */

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Shield, Users, CreditCard, Settings,
  BarChart3, Bell, Key, AlertTriangle,
  ChevronRight, Building2, LogOut, Save, X, Loader2,
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { AuditLogViewer } from './AuditLogViewer'
import { TeamManager } from './TeamManager'
import { ROLE_LABELS } from '../../types/cas'
import { supabase } from '../../lib/supabase'

type AdminTab = 'overview' | 'organization' | 'team' | 'billing' | 'audit'

const TABS = [
  { id: 'overview',      label: 'Resumen',        icon: BarChart3   },
  { id: 'organization',  label: 'Organización',   icon: Building2   },
  { id: 'team',          label: 'Equipo',          icon: Users       },
  { id: 'billing',       label: 'Facturación',     icon: CreditCard  },
  { id: 'audit',         label: 'Auditoría',       icon: Shield      },
] as const

// ─── OrgEditor ────────────────────────────────────────────────────────────────
function OrgEditor() {
  const { organization } = useAuth()
  const [editing, setEditing] = useState(false)
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState('')
  const [form, setForm] = useState({
    name:   organization?.name   ?? '',
    domain: organization?.domain ?? '',
  })

  const handleSave = async () => {
    if (!organization || !form.name.trim()) return
    setSaving(true)
    setError('')
    try {
      const { error: err } = await supabase
        .from('organizations')
        .update({ name: form.name.trim(), domain: form.domain.trim() || null, updated_at: new Date().toISOString() })
        .eq('id', organization.id)
      if (err) throw err
      setEditing(false)
      // Actualizar el nombre visible sin recargar la página
      organization.name   = form.name.trim()
      organization.domain = form.domain.trim() || undefined
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-5">
      {error && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Nombre */}
        <div className="space-y-1.5">
          <p className="text-xs text-gray-500">Nombre de la organización</p>
          {editing ? (
            <input
              value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500/50"
            />
          ) : (
            <p className="text-white font-medium">{organization?.name ?? '—'}</p>
          )}
        </div>
        {/* Dominio */}
        <div className="space-y-1.5">
          <p className="text-xs text-gray-500">Dominio principal</p>
          {editing ? (
            <input
              value={form.domain}
              onChange={e => setForm(p => ({ ...p, domain: e.target.value }))}
              placeholder="miempresa.com"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500/50"
            />
          ) : (
            <p className="text-white font-medium">{organization?.domain ?? '—'}</p>
          )}
        </div>
        {/* Plan (solo lectura) */}
        <div className="space-y-1.5">
          <p className="text-xs text-gray-500">Plan</p>
          <p className="text-white font-medium capitalize">{organization?.plan ?? '—'}</p>
        </div>
        {/* Estado (solo lectura) */}
        <div className="space-y-1.5">
          <p className="text-xs text-gray-500">Estado</p>
          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
            organization?.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
          }`}>{organization?.status ?? '—'}</span>
        </div>
      </div>
      <div className="pt-4 border-t border-white/10 flex gap-3">
        {editing ? (
          <>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 text-sm hover:bg-cyan-500/30 transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
            <button
              onClick={() => { setEditing(false); setError('') }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-400 text-sm hover:text-white transition-colors"
            >
              <X className="w-4 h-4" /> Cancelar
            </button>
          </>
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 text-sm hover:bg-cyan-500/30 transition-colors"
          >
            <Settings className="w-4 h-4" /> Editar configuración
          </button>
        )}
      </div>
    </div>
  )
}

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
            <OrgEditor />
          </motion.div>
        )}

        {/* Equipo */}
        {tab === 'team' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <TeamManager />
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
