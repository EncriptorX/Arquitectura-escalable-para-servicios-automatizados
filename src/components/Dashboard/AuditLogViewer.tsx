/**
 * AuditLogViewer
 * ─────────────────────────────────────────────────────────────────────────────
 * Visualiza el historial de auditoría de la organización.
 * Solo visible para managers y admins (Least Privilege).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Shield, AlertTriangle, AlertCircle, Info,
  Search, Filter, RefreshCw, Download,
  User, Clock, Globe, ChevronDown, ChevronUp,
  CheckCircle, XCircle, Ban,
} from 'lucide-react'
import { createClient } from '@supabase/supabase-js'
import { useAuth } from '../../contexts/AuthContext'
import { PermissionGate } from '../Common/PermissionGate'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || '',
  import.meta.env.VITE_SUPABASE_ANON_KEY || ''
)

// ─── Types ────────────────────────────────────────────────────────────────────
interface AuditLogEntry {
  id: string
  created_at: string
  action: string
  resource_type: string
  resource_id?: string
  action_result: 'success' | 'failure' | 'denied'
  severity: 'info' | 'warning' | 'critical'
  category: string
  ip_address?: string
  user_agent?: string
  metadata: Record<string, any>
  user_id?: string
  user_name?: string
  user_email?: string
  actor_role?: string
  total_count?: number
}

type FilterCategory = 'all' | 'auth' | 'data' | 'security' | 'billing' | 'admin' | 'system'
type FilterSeverity = 'all' | 'info' | 'warning' | 'critical'
type FilterResult   = 'all' | 'success' | 'failure' | 'denied'

const PAGE_SIZE = 20

// ─── Helpers visuales ─────────────────────────────────────────────────────────
const SEVERITY_CONFIG = {
  info:     { icon: Info,          color: 'text-blue-400',   bg: 'bg-blue-500/10',   border: 'border-blue-500/20',   label: 'Info'     },
  warning:  { icon: AlertTriangle, color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', label: 'Aviso'    },
  critical: { icon: AlertCircle,   color: 'text-red-400',    bg: 'bg-red-500/10',    border: 'border-red-500/20',    label: 'Crítico'  },
}

const RESULT_CONFIG = {
  success: { icon: CheckCircle, color: 'text-green-400',  label: 'Éxito'    },
  failure: { icon: XCircle,     color: 'text-red-400',    label: 'Error'    },
  denied:  { icon: Ban,         color: 'text-orange-400', label: 'Denegado' },
}

const CATEGORY_LABELS: Record<string, string> = {
  auth:     'Autenticación',
  data:     'Datos',
  security: 'Seguridad',
  billing:  'Facturación',
  admin:    'Administración',
  system:   'Sistema',
}

function formatAction(action: string): string {
  return action.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('es', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).format(new Date(iso))
}

// ─── Fila expandible ──────────────────────────────────────────────────────────
function AuditRow({ entry }: { entry: AuditLogEntry }) {
  const [expanded, setExpanded] = useState(false)
  const sev = SEVERITY_CONFIG[entry.severity]
  const res = RESULT_CONFIG[entry.action_result]
  const SevIcon = sev.icon
  const ResIcon = res.icon

  return (
    <motion.div
      layout
      className={`border rounded-xl overflow-hidden ${sev.border} ${sev.bg} mb-2`}
    >
      {/* Header row */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/5 transition-colors"
        aria-expanded={expanded}
      >
        {/* Severity icon */}
        <SevIcon className={`w-4 h-4 flex-shrink-0 ${sev.color}`} />

        {/* Action */}
        <span className="text-white text-sm font-medium flex-1 truncate">
          {formatAction(entry.action)}
        </span>

        {/* Category badge */}
        <span className="hidden sm:inline text-xs px-2 py-0.5 rounded-full bg-white/10 text-gray-300">
          {CATEGORY_LABELS[entry.category] ?? entry.category}
        </span>

        {/* Result */}
        <span className={`flex items-center gap-1 text-xs ${res.color}`}>
          <ResIcon className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{res.label}</span>
        </span>

        {/* User */}
        <span className="hidden md:flex items-center gap-1 text-xs text-gray-400 max-w-[140px] truncate">
          <User className="w-3 h-3 flex-shrink-0" />
          {entry.user_name ?? entry.user_email ?? 'Sistema'}
        </span>

        {/* Timestamp */}
        <span className="hidden lg:flex items-center gap-1 text-xs text-gray-500 flex-shrink-0">
          <Clock className="w-3 h-3" />
          {formatDate(entry.created_at)}
        </span>

        {/* Expand toggle */}
        {expanded
          ? <ChevronUp className="w-4 h-4 text-gray-500 flex-shrink-0" />
          : <ChevronDown className="w-4 h-4 text-gray-500 flex-shrink-0" />
        }
      </button>

      {/* Expanded detail */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-white/10 px-4 py-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-gray-400"
          >
            <Detail label="ID del evento"   value={entry.id} mono />
            <Detail label="Recurso"         value={`${entry.resource_type}${entry.resource_id ? ` · ${entry.resource_id}` : ''}`} mono />
            <Detail label="Usuario"         value={entry.user_email ?? '—'} />
            <Detail label="Rol del actor"   value={entry.actor_role ?? '—'} />
            <Detail label="IP"              value={entry.ip_address ?? '—'} mono />
            <Detail label="Fecha exacta"    value={formatDate(entry.created_at)} />
            {entry.user_agent && (
              <div className="sm:col-span-2">
                <Detail label="User Agent" value={entry.user_agent} mono />
              </div>
            )}
            {Object.keys(entry.metadata).length > 0 && (
              <div className="sm:col-span-2">
                <p className="text-gray-500 mb-1">Metadata</p>
                <pre className="bg-black/30 rounded-lg p-2 text-xs text-gray-300 overflow-x-auto">
                  {JSON.stringify(entry.metadata, null, 2)}
                </pre>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function Detail({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-gray-500 mb-0.5">{label}</p>
      <p className={`text-gray-300 truncate ${mono ? 'font-mono text-xs' : ''}`}>{value}</p>
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────
export function AuditLogViewer() {
  const { organization } = useAuth()

  const [logs,     setLogs]     = useState<AuditLogEntry[]>([])
  const [total,    setTotal]    = useState(0)
  const [page,     setPage]     = useState(0)
  const [loading,  setLoading]  = useState(false)
  const [search,   setSearch]   = useState('')
  const [category, setCategory] = useState<FilterCategory>('all')
  const [severity, setSeverity] = useState<FilterSeverity>('all')
  const [result,   setResult]   = useState<FilterResult>('all')

  const fetchLogs = useCallback(async () => {
    if (!organization) return
    setLoading(true)
    try {
      const { data, error } = await supabase.rpc('get_audit_logs', {
        p_org_id:   organization.id,
        p_limit:    PAGE_SIZE,
        p_offset:   page * PAGE_SIZE,
        p_category: category !== 'all' ? category : null,
        p_severity: severity !== 'all' ? severity : null,
      })

      if (error) throw error

      // Filtro de búsqueda local (acción, usuario, IP)
      const filtered = search
        ? (data ?? []).filter((e: AuditLogEntry) =>
            e.action.includes(search.toLowerCase()) ||
            e.user_email?.toLowerCase().includes(search.toLowerCase()) ||
            e.user_name?.toLowerCase().includes(search.toLowerCase()) ||
            e.ip_address?.includes(search)
          )
        : (data ?? [])

      // Filtro de resultado local
      const byResult = result !== 'all'
        ? filtered.filter((e: AuditLogEntry) => e.action_result === result)
        : filtered

      setLogs(byResult)
      setTotal(data?.[0]?.total_count ?? 0)
    } catch (err) {
      console.error('Error fetching audit logs:', err)
    } finally {
      setLoading(false)
    }
  }, [organization, page, category, severity, result, search])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  // Exportar CSV
  const exportCSV = () => {
    const headers = ['Fecha', 'Acción', 'Categoría', 'Resultado', 'Severidad', 'Usuario', 'IP']
    const rows = logs.map(e => [
      formatDate(e.created_at),
      e.action,
      e.category,
      e.action_result,
      e.severity,
      e.user_email ?? '',
      e.ip_address ?? '',
    ])
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <PermissionGate minRole="manager" fallback="locked">
      <div className="space-y-4">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-cyan-500/20 to-blue-600/20 w-10 h-10 rounded-xl flex items-center justify-center">
              <Shield className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Registro de Auditoría</h2>
              <p className="text-xs text-gray-400">{total.toLocaleString()} eventos registrados</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchLogs}
              disabled={loading}
              className="p-2 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-cyan-400 transition-colors disabled:opacity-50"
              aria-label="Actualizar"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={exportCSV}
              disabled={logs.length === 0}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-cyan-400 transition-colors text-sm disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Exportar CSV</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(0) }}
              placeholder="Buscar acción, usuario, IP..."
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50"
            />
          </div>

          {/* Category filter */}
          <FilterSelect
            icon={<Filter className="w-3.5 h-3.5" />}
            value={category}
            onChange={v => { setCategory(v as FilterCategory); setPage(0) }}
            options={[
              { value: 'all',      label: 'Todas las categorías' },
              { value: 'auth',     label: 'Autenticación' },
              { value: 'data',     label: 'Datos' },
              { value: 'security', label: 'Seguridad' },
              { value: 'billing',  label: 'Facturación' },
              { value: 'admin',    label: 'Administración' },
              { value: 'system',   label: 'Sistema' },
            ]}
          />

          {/* Severity filter */}
          <FilterSelect
            icon={<AlertTriangle className="w-3.5 h-3.5" />}
            value={severity}
            onChange={v => { setSeverity(v as FilterSeverity); setPage(0) }}
            options={[
              { value: 'all',      label: 'Toda severidad' },
              { value: 'info',     label: 'Info' },
              { value: 'warning',  label: 'Aviso' },
              { value: 'critical', label: 'Crítico' },
            ]}
          />

          {/* Result filter */}
          <FilterSelect
            icon={<CheckCircle className="w-3.5 h-3.5" />}
            value={result}
            onChange={v => { setResult(v as FilterResult); setPage(0) }}
            options={[
              { value: 'all',     label: 'Todos los resultados' },
              { value: 'success', label: 'Éxito' },
              { value: 'failure', label: 'Error' },
              { value: 'denied',  label: 'Denegado' },
            ]}
          />
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-3">
          {(['info', 'warning', 'critical'] as const).map(sev => {
            const cfg   = SEVERITY_CONFIG[sev]
            const count = logs.filter(e => e.severity === sev).length
            const Icon  = cfg.icon
            return (
              <div key={sev} className={`flex items-center gap-2 px-3 py-2 rounded-xl ${cfg.bg} border ${cfg.border}`}>
                <Icon className={`w-4 h-4 ${cfg.color}`} />
                <span className="text-xs text-gray-300">{cfg.label}</span>
                <span className={`ml-auto text-sm font-bold ${cfg.color}`}>{count}</span>
              </div>
            )
          })}
        </div>

        {/* Log list */}
        <div className="min-h-[200px]">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <RefreshCw className="w-6 h-6 text-cyan-400 animate-spin" />
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-500">
              <Shield className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-sm">No hay eventos que coincidan con los filtros</p>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={`${page}-${category}-${severity}-${result}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {logs.map(entry => (
                  <AuditRow key={entry.id} entry={entry} />
                ))}
              </motion.div>
            </AnimatePresence>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between text-sm text-gray-400">
            <span>Página {page + 1} de {totalPages}</span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:border-cyan-500/30 disabled:opacity-40 transition-colors"
              >
                Anterior
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:border-cyan-500/30 disabled:opacity-40 transition-colors"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>
    </PermissionGate>
  )
}

// ─── FilterSelect helper ──────────────────────────────────────────────────────
function FilterSelect({
  icon, value, onChange, options,
}: {
  icon: React.ReactNode
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <div className="relative flex items-center">
      <span className="absolute left-3 text-gray-500 pointer-events-none">{icon}</span>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="bg-white/5 border border-white/10 rounded-xl pl-8 pr-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-cyan-500/50 appearance-none cursor-pointer"
      >
        {options.map(o => (
          <option key={o.value} value={o.value} className="bg-gray-900">
            {o.label}
          </option>
        ))}
      </select>
    </div>
  )
}
