/**
 * ReportManager
 * Panel de reportes con IA para Coordinador, Analista y Admin.
 * Genera reportes via Edge Function ai-reports (DeepSeek),
 * los lista desde Supabase y permite visualizarlos en detalle.
 */

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileText, Plus, RefreshCw, Download, Eye,
  Loader2, CheckCircle, XCircle, Clock,
  AlertTriangle, X, Check, Shield, Zap,
  BarChart3, Globe, ChevronDown, ChevronUp,
  Sparkles,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

// ─── Types ────────────────────────────────────────────────────────────────────
interface Report {
  id:              string
  domain_id:       string | null
  title:           string
  report_type:     ReportType
  format:          'pdf' | 'html' | 'json'
  status:          'generating' | 'completed' | 'failed'
  summary:         string | null
  findings:        Finding[]
  recommendations: Recommendation[]
  generated_by_ai: boolean
  error_message:   string | null
  generated_at:    string | null
  created_at:      string
  domain?:         { domain: string } | null
}

interface Finding {
  title:       string
  severity:    'critical' | 'high' | 'medium' | 'low' | 'info'
  description: string
  evidence?:   string
  impact?:     string
}

interface Recommendation {
  title:          string
  priority:       'high' | 'medium' | 'low'
  description:    string
  implementation?: string
  timeline?:      string
}

interface Domain {
  id:     string
  domain: string
}

type ReportType = 'security' | 'vulnerability' | 'performance' | 'compliance' | 'comprehensive'

// ─── Config visual ────────────────────────────────────────────────────────────
const REPORT_TYPES: { value: ReportType; label: string; desc: string; icon: typeof Shield; color: string }[] = [
  { value: 'security',       label: 'Seguridad',         desc: 'Análisis de protección perimetral',    icon: Shield,    color: 'cyan'   },
  { value: 'vulnerability',  label: 'Vulnerabilidades',  desc: 'CVEs y vectores de ataque',            icon: AlertTriangle, color: 'red' },
  { value: 'performance',    label: 'Rendimiento',       desc: 'Latencia, throughput y errores',       icon: Zap,       color: 'yellow' },
  { value: 'compliance',     label: 'Compliance',        desc: 'PCI DSS, GDPR y normativas',           icon: CheckCircle,color: 'green' },
  { value: 'comprehensive',  label: 'Completo',          desc: 'Análisis integral de todos los ejes',  icon: BarChart3, color: 'purple' },
]

const SEVERITY_CONFIG = {
  critical: { color: 'red',    label: 'Crítico',  order: 0 },
  high:     { color: 'orange', label: 'Alto',     order: 1 },
  medium:   { color: 'yellow', label: 'Medio',    order: 2 },
  low:      { color: 'blue',   label: 'Bajo',     order: 3 },
  info:     { color: 'gray',   label: 'Info',     order: 4 },
} as const

const PRIORITY_CONFIG = {
  high:   { color: 'red',    label: 'Alta'   },
  medium: { color: 'yellow', label: 'Media'  },
  low:    { color: 'gray',   label: 'Baja'   },
} as const

const STATUS_CONFIG = {
  generating: { icon: Loader2,      color: 'yellow', label: 'Generando...',  spin: true  },
  completed:  { icon: CheckCircle,  color: 'green',  label: 'Completado',    spin: false },
  failed:     { icon: XCircle,      color: 'red',    label: 'Error',         spin: false },
} as const

// ─── Componente principal ─────────────────────────────────────────────────────
export function ReportManager() {
  const { organization } = useAuth()

  const [reports,     setReports]     = useState<Report[]>([])
  const [domains,     setDomains]     = useState<Domain[]>([])
  const [loading,     setLoading]     = useState(true)
  const [showForm,    setShowForm]    = useState(false)
  const [generating,  setGenerating]  = useState(false)
  const [viewReport,  setViewReport]  = useState<Report | null>(null)
  const [feedback,    setFeedback]    = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
  const [polling,     setPolling]     = useState<Set<string>>(new Set())

  const [form, setForm] = useState({
    domainId:              '',
    reportType:            'security' as ReportType,
    includeRecommendations: true,
  })

  // ── Cargar datos ─────────────────────────────────────────────────────────
  const loadReports = useCallback(async () => {
    if (!organization) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('reports')
        .select('*, domain:domains(domain)')
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false })
        .limit(50)
      if (error) throw error
      setReports((data ?? []) as Report[])
    } catch (err: any) {
      setFeedback({ type: 'error', msg: 'Error cargando reportes: ' + err.message })
    } finally {
      setLoading(false)
    }
  }, [organization])

  const loadDomains = useCallback(async () => {
    if (!organization) return
    const { data } = await supabase
      .from('domains')
      .select('id, domain')
      .eq('organization_id', organization.id)
      .eq('status', 'active')
    setDomains((data ?? []) as Domain[])
  }, [organization])

  useEffect(() => {
    loadReports()
    loadDomains()
  }, [loadReports, loadDomains])

  // ── Polling para reportes en generación ──────────────────────────────────
  useEffect(() => {
    const generating = reports.filter(r => r.status === 'generating')
    if (!generating.length) return

    const interval = setInterval(async () => {
      for (const rep of generating) {
        const { data } = await supabase
          .from('reports')
          .select('status, summary, findings, recommendations, error_message, generated_at')
          .eq('id', rep.id)
          .single()

        if (data && data.status !== 'generating') {
          setReports(prev => prev.map(r =>
            r.id === rep.id ? { ...r, ...data } : r
          ))
        }
      }
    }, 3000)

    return () => clearInterval(interval)
  }, [reports])

  // ── Generar reporte ───────────────────────────────────────────────────────
  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.domainId || !organization) return

    setGenerating(true)
    setFeedback(null)

    try {
      const { data: session } = await supabase.auth.getSession()
      const token = session.session?.access_token
      if (!token) throw new Error('No hay sesión activa')

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
      const res = await fetch(`${supabaseUrl}/functions/v1/ai-reports/generate`, {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          domainId:              form.domainId,
          reportType:            form.reportType,
          format:                'html',
          includeRecommendations: form.includeRecommendations,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }))
        throw new Error(err.error ?? `Error ${res.status}`)
      }

      const { data: newReport } = await res.json()
      setFeedback({ type: 'success', msg: 'Reporte en generación. Puede tardar unos segundos...' })
      setShowForm(false)
      setForm({ domainId: '', reportType: 'security', includeRecommendations: true })

      // Agregar el reporte nuevo al listado inmediatamente
      if (newReport) {
        setReports(prev => [newReport as Report, ...prev])
      } else {
        await loadReports()
      }

    } catch (err: any) {
      setFeedback({ type: 'error', msg: err.message })
    } finally {
      setGenerating(false)
    }
  }

  // ── Exportar reporte como HTML ────────────────────────────────────────────
  const handleExport = (report: Report) => {
    const html = buildReportHTML(report)
    const blob = new Blob([html], { type: 'text/html' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `reporte-${report.report_type}-${new Date(report.created_at).toISOString().slice(0, 10)}.html`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Reportes con IA</h1>
          <p className="text-gray-400 text-sm mt-1">
            {reports.filter(r => r.status === 'completed').length} completado{reports.filter(r => r.status === 'completed').length !== 1 ? 's' : ''} de {reports.length} total
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadReports} disabled={loading}
            className="p-2 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-blue-400 transition-colors">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => { setShowForm(v => !v); setFeedback(null) }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500/20 border border-blue-500/30 text-blue-400 text-sm hover:bg-blue-500/30 transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            Generar con IA
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

      {/* Formulario de generación */}
      <AnimatePresence>
        {showForm && (
          <motion.form
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            onSubmit={handleGenerate}
            className="bg-white/5 border border-blue-500/20 rounded-2xl p-6 space-y-5"
          >
            <h2 className="text-white font-semibold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-400" />
              Generar nuevo reporte con IA
            </h2>

            {/* Dominio */}
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">
                Dominio a analizar <span className="text-red-400">*</span>
              </label>
              {domains.length === 0 ? (
                <p className="text-sm text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-4 py-3">
                  No hay dominios activos. Agrega un dominio primero.
                </p>
              ) : (
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <select
                    value={form.domainId}
                    onChange={e => setForm(p => ({ ...p, domainId: e.target.value }))}
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500/50 appearance-none"
                  >
                    <option value="" className="bg-gray-900">-- Selecciona un dominio --</option>
                    {domains.map(d => (
                      <option key={d.id} value={d.id} className="bg-gray-900">{d.domain}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Tipo de reporte */}
            <div>
              <label className="block text-xs text-gray-400 mb-2">Tipo de reporte</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                {REPORT_TYPES.map(rt => {
                  const Icon = rt.icon
                  const selected = form.reportType === rt.value
                  return (
                    <button
                      key={rt.value}
                      type="button"
                      onClick={() => setForm(p => ({ ...p, reportType: rt.value }))}
                      className={`p-3 rounded-xl text-left transition-all border ${
                        selected
                          ? `bg-${rt.color}-500/20 border-${rt.color}-500/40 text-${rt.color}-400`
                          : 'bg-white/3 border-white/10 text-gray-400 hover:bg-white/8'
                      }`}
                    >
                      <Icon className={`w-4 h-4 mb-1.5 ${selected ? `text-${rt.color}-400` : ''}`} />
                      <p className="text-xs font-medium">{rt.label}</p>
                      <p className="text-xs text-gray-500 mt-0.5 hidden sm:block">{rt.desc}</p>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Opciones */}
            <label className="flex items-center gap-3 cursor-pointer">
              <div
                onClick={() => setForm(p => ({ ...p, includeRecommendations: !p.includeRecommendations }))}
                className={`w-10 h-5 rounded-full transition-colors relative ${form.includeRecommendations ? 'bg-blue-500' : 'bg-gray-600'}`}
              >
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${form.includeRecommendations ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </div>
              <span className="text-sm text-gray-300">Incluir recomendaciones accionables</span>
            </label>

            <div className="flex gap-3">
              <button type="submit" disabled={generating || !form.domainId}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500/20 border border-blue-500/30 text-blue-400 text-sm hover:bg-blue-500/30 transition-colors disabled:opacity-50">
                {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {generating ? 'Generando...' : 'Generar reporte'}
              </button>
              <button type="button" onClick={() => setShowForm(false)}
                className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-400 text-sm hover:text-white transition-colors">
                Cancelar
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Lista de reportes */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
        </div>
      ) : reports.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white/3 border border-white/10 rounded-2xl text-gray-600">
          <FileText className="w-12 h-12 mb-3 opacity-30" />
          <p className="text-sm">No hay reportes generados</p>
          <p className="text-xs mt-1">Selecciona un dominio y genera tu primer reporte con IA</p>
          <button onClick={() => setShowForm(true)}
            className="mt-4 flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500/20 border border-blue-500/30 text-blue-400 text-sm hover:bg-blue-500/30 transition-colors">
            <Sparkles className="w-4 h-4" />
            Generar reporte
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map(report => {
            const st   = STATUS_CONFIG[report.status]
            const rt   = REPORT_TYPES.find(t => t.value === report.report_type)
            const Icon = st.icon

            return (
              <motion.div key={report.id} layout
                className="flex items-center gap-4 p-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/8 transition-colors"
              >
                {/* Status */}
                <div className={`w-9 h-9 rounded-xl bg-${st.color}-500/10 border border-${st.color}-500/20 flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`w-4 h-4 text-${st.color}-400 ${st.spin ? 'animate-spin' : ''}`} />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{report.title}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {rt && (
                      <span className={`text-xs text-${rt.color}-400`}>{rt.label}</span>
                    )}
                    {report.domain?.domain && (
                      <>
                        <span className="text-gray-600">·</span>
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Globe className="w-3 h-3" />
                          {report.domain.domain}
                        </span>
                      </>
                    )}
                    <span className="text-gray-600">·</span>
                    <span className="text-xs text-gray-500">
                      {new Date(report.created_at).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                    {report.findings?.length > 0 && (
                      <>
                        <span className="text-gray-600">·</span>
                        <span className="text-xs text-gray-400">{report.findings.length} hallazgos</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Badges */}
                {report.generated_by_ai && (
                  <span className="hidden sm:inline text-xs px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 flex-shrink-0">
                    IA
                  </span>
                )}

                {/* Actions */}
                {report.status === 'completed' && (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => setViewReport(report)}
                      className="p-1.5 rounded-lg text-gray-500 hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
                      title="Ver reporte"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleExport(report)}
                      className="p-1.5 rounded-lg text-gray-500 hover:text-green-400 hover:bg-green-500/10 transition-colors"
                      title="Descargar HTML"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                )}
                {report.status === 'failed' && (
                  <span className="text-xs text-red-400 flex-shrink-0 max-w-32 truncate" title={report.error_message ?? ''}>
                    {report.error_message ?? 'Error desconocido'}
                  </span>
                )}
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Modal de visualización */}
      <AnimatePresence>
        {viewReport && (
          <ReportViewer report={viewReport} onClose={() => setViewReport(null)} onExport={() => handleExport(viewReport)} />
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── ReportViewer ─────────────────────────────────────────────────────────────
function ReportViewer({ report, onClose, onExport }: {
  report:   Report
  onClose:  () => void
  onExport: () => void
}) {
  const [expandedFinding, setExpandedFinding] = useState<number | null>(null)
  const rt = REPORT_TYPES.find(t => t.value === report.report_type)

  // Ordenar hallazgos por severidad
  const sortedFindings = [...(report.findings ?? [])].sort(
    (a, b) => SEVERITY_CONFIG[a.severity].order - SEVERITY_CONFIG[b.severity].order
  )

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
        className="w-full max-w-3xl bg-gray-900 border border-white/10 rounded-2xl my-8"
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              {rt && <span className={`text-xs px-2 py-0.5 rounded-full bg-${rt.color}-500/10 text-${rt.color}-400 border border-${rt.color}-500/20`}>{rt.label}</span>}
              <span className="text-xs text-gray-500">
                {report.generated_at ? new Date(report.generated_at).toLocaleString('es') : '—'}
              </span>
            </div>
            <h2 className="text-xl font-bold text-white">{report.title}</h2>
            {report.domain?.domain && (
              <p className="text-sm text-gray-400 mt-1 flex items-center gap-1">
                <Globe className="w-3.5 h-3.5" />{report.domain.domain}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onExport}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/20 border border-green-500/30 text-green-400 text-xs hover:bg-green-500/30 transition-colors">
              <Download className="w-3.5 h-3.5" />
              Exportar
            </button>
            <button onClick={onClose} className="p-1.5 text-gray-500 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Resumen ejecutivo */}
          {report.summary && (
            <div>
              <h3 className="text-sm font-semibold text-white mb-2">Resumen ejecutivo</h3>
              <p className="text-sm text-gray-300 leading-relaxed bg-white/3 rounded-xl p-4 border border-white/10">
                {report.summary}
              </p>
            </div>
          )}

          {/* Hallazgos */}
          {sortedFindings.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-white">
                  Hallazgos ({sortedFindings.length})
                </h3>
                {/* Resumen por severidad */}
                <div className="flex items-center gap-2">
                  {(['critical','high','medium','low'] as const).map(sev => {
                    const count = sortedFindings.filter(f => f.severity === sev).length
                    if (!count) return null
                    const cfg = SEVERITY_CONFIG[sev]
                    return (
                      <span key={sev} className={`text-xs px-2 py-0.5 rounded-full bg-${cfg.color}-500/10 text-${cfg.color}-400 border border-${cfg.color}-500/20`}>
                        {count} {cfg.label}
                      </span>
                    )
                  })}
                </div>
              </div>
              <div className="space-y-2">
                {sortedFindings.map((finding, i) => {
                  const sev = SEVERITY_CONFIG[finding.severity]
                  const isOpen = expandedFinding === i
                  return (
                    <div key={i} className={`border border-${sev.color}-500/20 rounded-xl overflow-hidden`}>
                      <button
                        onClick={() => setExpandedFinding(isOpen ? null : i)}
                        className={`w-full flex items-center gap-3 px-4 py-3 bg-${sev.color}-500/5 hover:bg-${sev.color}-500/10 transition-colors text-left`}
                      >
                        <span className={`w-2 h-2 rounded-full bg-${sev.color}-400 flex-shrink-0`} />
                        <span className="text-white text-sm flex-1">{finding.title}</span>
                        <span className={`text-xs text-${sev.color}-400 flex-shrink-0`}>{sev.label}</span>
                        {isOpen ? <ChevronUp className="w-3.5 h-3.5 text-gray-500" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-500" />}
                      </button>
                      {isOpen && (
                        <div className="px-4 py-3 space-y-2 border-t border-white/5 text-sm text-gray-300">
                          <p>{finding.description}</p>
                          {finding.evidence && (
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Evidencia</p>
                              <p className="font-mono text-xs bg-black/30 rounded-lg p-2">{finding.evidence}</p>
                            </div>
                          )}
                          {finding.impact && (
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Impacto</p>
                              <p>{finding.impact}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Recomendaciones */}
          {report.recommendations?.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-white mb-3">
                Recomendaciones ({report.recommendations.length})
              </h3>
              <div className="space-y-2">
                {report.recommendations.map((rec, i) => {
                  const pri = PRIORITY_CONFIG[rec.priority]
                  return (
                    <div key={i} className="p-4 bg-white/3 border border-white/10 rounded-xl space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="text-white text-sm font-medium">{rec.title}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full bg-${pri.color}-500/10 text-${pri.color}-400 border border-${pri.color}-500/20`}>
                          {pri.label}
                        </span>
                      </div>
                      <p className="text-sm text-gray-400">{rec.description}</p>
                      {rec.implementation && (
                        <p className="text-xs text-gray-500">📌 {rec.implementation}</p>
                      )}
                      {rec.timeline && (
                        <p className="text-xs text-gray-500">⏱ {rec.timeline}</p>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Generador de HTML para exportar ─────────────────────────────────────────
function buildReportHTML(report: Report): string {
  const rt      = REPORT_TYPES.find(t => t.value === report.report_type)
  const date    = report.generated_at
    ? new Date(report.generated_at).toLocaleString('es')
    : new Date(report.created_at).toLocaleString('es')

  const findingsHTML = (report.findings ?? [])
    .sort((a, b) => SEVERITY_CONFIG[a.severity].order - SEVERITY_CONFIG[b.severity].order)
    .map(f => `
      <div style="border-left:4px solid var(--sev-${f.severity});padding:12px 16px;margin:8px 0;background:#1a1a2e;border-radius:0 8px 8px 0">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <strong style="color:#fff">${f.title}</strong>
          <span style="font-size:11px;background:#ffffff22;padding:2px 8px;border-radius:12px;color:#ccc">${SEVERITY_CONFIG[f.severity].label}</span>
        </div>
        <p style="color:#aaa;margin:8px 0 0">${f.description}</p>
        ${f.impact ? `<p style="color:#888;font-size:12px;margin:4px 0 0">Impacto: ${f.impact}</p>` : ''}
      </div>
    `).join('')

  const recsHTML = (report.recommendations ?? []).map(r => `
    <div style="padding:12px 16px;margin:8px 0;background:#1a1a2e;border-radius:8px;border:1px solid #333">
      <div style="display:flex;justify-content:space-between">
        <strong style="color:#fff">${r.title}</strong>
        <span style="font-size:11px;color:#888">${PRIORITY_CONFIG[r.priority].label}</span>
      </div>
      <p style="color:#aaa;margin:8px 0 0">${r.description}</p>
      ${r.implementation ? `<p style="color:#888;font-size:12px;margin:4px 0 0">📌 ${r.implementation}</p>` : ''}
      ${r.timeline ? `<p style="color:#888;font-size:12px;margin:4px 0 0">⏱ ${r.timeline}</p>` : ''}
    </div>
  `).join('')

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${report.title}</title>
<style>
  :root{--sev-critical:#ef4444;--sev-high:#f97316;--sev-medium:#eab308;--sev-low:#3b82f6;--sev-info:#6b7280}
  body{font-family:system-ui,sans-serif;background:#0f0f1a;color:#e5e5e5;margin:0;padding:32px;max-width:900px;margin:0 auto}
  h1{color:#fff;font-size:24px;margin-bottom:4px}
  h2{color:#38bdf8;font-size:16px;margin:24px 0 12px;border-bottom:1px solid #333;padding-bottom:8px}
  .meta{color:#888;font-size:13px;margin-bottom:24px}
  .summary{background:#1a1a2e;border:1px solid #333;border-radius:8px;padding:16px;color:#ccc;line-height:1.6}
</style>
</head>
<body>
<h1>${report.title}</h1>
<p class="meta">Tipo: ${rt?.label ?? report.report_type} · Generado: ${date} · Dominio: ${report.domain?.domain ?? '—'}</p>
${report.summary ? `<h2>Resumen Ejecutivo</h2><div class="summary">${report.summary}</div>` : ''}
${findingsHTML ? `<h2>Hallazgos (${report.findings?.length ?? 0})</h2>${findingsHTML}` : ''}
${recsHTML ? `<h2>Recomendaciones (${report.recommendations?.length ?? 0})</h2>${recsHTML}` : ''}
<p style="color:#555;font-size:11px;margin-top:48px;text-align:center">Cuban CAS — Generado con IA (DeepSeek)</p>
</body></html>`
}
