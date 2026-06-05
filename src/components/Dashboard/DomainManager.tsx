/**
 * DomainManager
 * Panel de gestión de dominios para Coordinador y Admin.
 * CRUD completo: listar, agregar, editar estado y eliminar.
 */

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Globe, Plus, Trash2, RefreshCw, CheckCircle,
  Clock, XCircle, AlertTriangle, Loader2,
  Shield, ExternalLink, X, Check, Edit2,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

// ─── Types ────────────────────────────────────────────────────────────────────
interface Domain {
  id:                  string
  domain:              string
  subdomain:           string | null
  status:              'active' | 'inactive' | 'pending' | 'error'
  verification_status: 'pending' | 'verified' | 'failed'
  cloudflare_zone_id:  string | null
  created_at:          string
  updated_at:          string
}

const STATUS_CONFIG = {
  active:   { icon: CheckCircle,   color: 'green',  label: 'Activo'      },
  inactive: { icon: XCircle,       color: 'gray',   label: 'Inactivo'    },
  pending:  { icon: Clock,         color: 'yellow', label: 'Pendiente'   },
  error:    { icon: AlertTriangle, color: 'red',    label: 'Error'       },
} as const

const VERIFY_CONFIG = {
  verified: { color: 'green',  label: 'Verificado'    },
  pending:  { color: 'yellow', label: 'Sin verificar' },
  failed:   { color: 'red',    label: 'Falló'         },
} as const

// ─── Componente ───────────────────────────────────────────────────────────────
export function DomainManager() {
  const { organization } = useAuth()

  const [domains,      setDomains]      = useState<Domain[]>([])
  const [loading,      setLoading]      = useState(true)
  const [showForm,     setShowForm]     = useState(false)
  const [saving,       setSaving]       = useState(false)
  const [deleting,     setDeleting]     = useState<string | null>(null)
  const [feedback,     setFeedback]     = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
  const [editingId,    setEditingId]    = useState<string | null>(null)

  const [form, setForm] = useState({ domain: '', subdomain: '' })

  // ── Cargar dominios ──────────────────────────────────────────────────────
  const load = useCallback(async () => {
    if (!organization) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('domains')
        .select('*')
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setDomains((data ?? []) as Domain[])
    } catch (err: any) {
      setFeedback({ type: 'error', msg: 'Error cargando dominios: ' + err.message })
    } finally {
      setLoading(false)
    }
  }, [organization])

  useEffect(() => { load() }, [load])

  // ── Agregar dominio ──────────────────────────────────────────────────────
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.domain.trim() || !organization) return

    // Limpiar dominio (quitar http/https y trailing slash)
    const cleanDomain = form.domain
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//i, '')
      .replace(/\/+$/, '')

    setSaving(true)
    setFeedback(null)
    try {
      const { error } = await supabase
        .from('domains')
        .insert({
          organization_id:     organization.id,
          domain:              cleanDomain,
          subdomain:           form.subdomain.trim() || null,
          status:              'pending',
          verification_status: 'pending',
          security_config:     {},
        })

      if (error) {
        if (error.code === '23505') throw new Error('Este dominio ya está registrado.')
        throw error
      }

      setFeedback({ type: 'success', msg: `Dominio ${cleanDomain} agregado correctamente.` })
      setForm({ domain: '', subdomain: '' })
      setShowForm(false)
      await load()
    } catch (err: any) {
      setFeedback({ type: 'error', msg: err.message })
    } finally {
      setSaving(false)
    }
  }

  // ── Cambiar estado ───────────────────────────────────────────────────────
  const handleToggleStatus = async (domain: Domain) => {
    const newStatus = domain.status === 'active' ? 'inactive' : 'active'
    try {
      const { error } = await supabase
        .from('domains')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', domain.id)
        .eq('organization_id', organization!.id)

      if (error) throw error
      setDomains(prev => prev.map(d =>
        d.id === domain.id ? { ...d, status: newStatus } : d
      ))
      setFeedback({ type: 'success', msg: `Dominio ${newStatus === 'active' ? 'activado' : 'desactivado'}.` })
    } catch (err: any) {
      setFeedback({ type: 'error', msg: err.message })
    }
  }

  // ── Eliminar dominio ─────────────────────────────────────────────────────
  const handleDelete = async (domain: Domain) => {
    if (!confirm(`¿Eliminar el dominio ${domain.domain}? Esta acción no se puede deshacer.`)) return

    setDeleting(domain.id)
    setFeedback(null)
    try {
      const { error } = await supabase
        .from('domains')
        .delete()
        .eq('id', domain.id)
        .eq('organization_id', organization!.id)

      if (error) throw error
      setDomains(prev => prev.filter(d => d.id !== domain.id))
      setFeedback({ type: 'success', msg: `Dominio ${domain.domain} eliminado.` })
    } catch (err: any) {
      setFeedback({ type: 'error', msg: err.message })
    } finally {
      setDeleting(null)
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dominios</h1>
          <p className="text-gray-400 text-sm mt-1">
            {domains.filter(d => d.status === 'active').length} activo{domains.filter(d => d.status === 'active').length !== 1 ? 's' : ''} de {domains.length} total
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} disabled={loading}
            className="p-2 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-purple-400 transition-colors disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => { setShowForm(v => !v); setFeedback(null) }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-500/20 border border-purple-500/30 text-purple-400 text-sm hover:bg-purple-500/30 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Agregar dominio
          </button>
        </div>
      </div>

      {/* Feedback */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className={`flex items-center gap-3 p-3 rounded-xl text-sm ${
              feedback.type === 'success'
                ? 'bg-green-500/10 border border-green-500/20 text-green-400'
                : 'bg-red-500/10 border border-red-500/20 text-red-400'
            }`}
          >
            {feedback.type === 'success' ? <Check className="w-4 h-4 flex-shrink-0" /> : <AlertTriangle className="w-4 h-4 flex-shrink-0" />}
            <span className="flex-1">{feedback.msg}</span>
            <button onClick={() => setFeedback(null)}><X className="w-3.5 h-3.5" /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Formulario de agregar */}
      <AnimatePresence>
        {showForm && (
          <motion.form
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            onSubmit={handleAdd}
            className="bg-white/5 border border-purple-500/20 rounded-2xl p-6 space-y-4"
          >
            <h2 className="text-white font-semibold flex items-center gap-2">
              <Globe className="w-4 h-4 text-purple-400" />
              Registrar nuevo dominio
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">
                  Dominio <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    value={form.domain}
                    onChange={e => setForm(p => ({ ...p, domain: e.target.value }))}
                    placeholder="miempresa.com"
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-purple-500/50"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Sin http:// ni https://</p>
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1.5">
                  Subdominio <span className="text-gray-500">(opcional)</span>
                </label>
                <input
                  type="text"
                  value={form.subdomain}
                  onChange={e => setForm(p => ({ ...p, subdomain: e.target.value }))}
                  placeholder="www"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-purple-500/50"
                />
              </div>
            </div>

            {/* Preview */}
            {form.domain && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
                <Shield className="w-3.5 h-3.5 text-purple-400" />
                <span className="text-xs text-purple-300 font-mono">
                  {form.subdomain ? `${form.subdomain}.` : ''}{form.domain.replace(/^https?:\/\//i, '')}
                </span>
              </div>
            )}

            <div className="flex gap-3">
              <button type="submit" disabled={saving}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-500/20 border border-purple-500/30 text-purple-400 text-sm hover:bg-purple-500/30 transition-colors disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {saving ? 'Guardando...' : 'Agregar dominio'}
              </button>
              <button type="button" onClick={() => { setShowForm(false); setForm({ domain: '', subdomain: '' }) }}
                className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-400 text-sm hover:text-white transition-colors">
                Cancelar
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Lista de dominios */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
        </div>
      ) : domains.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white/3 border border-white/10 rounded-2xl text-gray-600">
          <Globe className="w-12 h-12 mb-3 opacity-30" />
          <p className="text-sm">No hay dominios registrados</p>
          <p className="text-xs mt-1">Agrega tu primer dominio para comenzar</p>
          <button onClick={() => setShowForm(true)}
            className="mt-4 flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-500/20 border border-purple-500/30 text-purple-400 text-sm hover:bg-purple-500/30 transition-colors">
            <Plus className="w-4 h-4" />
            Agregar dominio
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {domains.map(domain => {
            const st  = STATUS_CONFIG[domain.status]
            const vrf = VERIFY_CONFIG[domain.verification_status]
            const StatusIcon = st.icon

            return (
              <motion.div key={domain.id} layout
                className="flex items-center gap-4 p-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/8 transition-colors"
              >
                {/* Status icon */}
                <div className={`w-9 h-9 rounded-xl bg-${st.color}-500/10 border border-${st.color}-500/20 flex items-center justify-center flex-shrink-0`}>
                  <StatusIcon className={`w-4 h-4 text-${st.color}-400`} />
                </div>

                {/* Domain info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-white font-medium text-sm">
                      {domain.subdomain ? `${domain.subdomain}.` : ''}{domain.domain}
                    </p>
                    <a
                      href={`https://${domain.subdomain ? domain.subdomain + '.' : ''}${domain.domain}`}
                      target="_blank" rel="noopener noreferrer"
                      className="text-gray-500 hover:text-purple-400 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    <span className={`text-xs text-${st.color}-400`}>{st.label}</span>
                    <span className="text-gray-600">·</span>
                    <span className={`text-xs text-${vrf.color}-400`}>{vrf.label}</span>
                    <span className="text-gray-600">·</span>
                    <span className="text-xs text-gray-500">
                      {new Date(domain.created_at).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                </div>

                {/* Cloudflare badge */}
                {domain.cloudflare_zone_id && (
                  <span className="hidden sm:inline text-xs px-2 py-0.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 flex-shrink-0">
                    Cloudflare
                  </span>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* Toggle active/inactive */}
                  <button
                    onClick={() => handleToggleStatus(domain)}
                    title={domain.status === 'active' ? 'Desactivar' : 'Activar'}
                    className={`p-1.5 rounded-lg transition-colors ${
                      domain.status === 'active'
                        ? 'text-green-400 hover:bg-red-500/10 hover:text-red-400'
                        : 'text-gray-500 hover:bg-green-500/10 hover:text-green-400'
                    }`}
                  >
                    {domain.status === 'active'
                      ? <CheckCircle className="w-4 h-4" />
                      : <XCircle className="w-4 h-4" />
                    }
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => handleDelete(domain)}
                    disabled={deleting === domain.id}
                    className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                    title="Eliminar dominio"
                  >
                    {deleting === domain.id
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : <Trash2 className="w-4 h-4" />
                    }
                  </button>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Stats bar */}
      {domains.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          {(Object.entries(STATUS_CONFIG) as [Domain['status'], typeof STATUS_CONFIG[keyof typeof STATUS_CONFIG]][]).map(([status, cfg]) => {
            const count = domains.filter(d => d.status === status).length
            const Icon  = cfg.icon
            return (
              <div key={status} className={`flex items-center gap-2 px-3 py-2 rounded-xl bg-${cfg.color}-500/10 border border-${cfg.color}-500/20`}>
                <Icon className={`w-3.5 h-3.5 text-${cfg.color}-400`} />
                <span className="text-xs text-gray-300">{cfg.label}</span>
                <span className={`ml-auto text-sm font-bold text-${cfg.color}-400`}>{count}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
