/**
 * DeploymentDiagram
 * Diagrama de despliegue de Cuban CAS.
 * Muestra nodos de infraestructura, artefactos desplegados y comunicaciones.
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Cloud, Server, Database, Globe, Shield,
  Code2, GitBranch, Zap, Lock, ArrowRight,
  ChevronDown, CheckCircle, AlertTriangle,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────
interface Artifact {
  name:     string
  type:     'runtime' | 'function' | 'static' | 'config'
  desc:     string
  tech?:    string
}

interface DeployNode {
  id:       string
  name:     string
  provider: string
  icon:     typeof Cloud
  color:    string
  region:   string
  tier:     string
  artifacts: Artifact[]
  env:      string[]
}

interface DeployLink {
  from:     string
  to:       string
  protocol: string
  desc:     string
  secure:   boolean
}

// ─── Nodos de infraestructura ─────────────────────────────────────────────────
const NODES: DeployNode[] = [
  {
    id:       'cloudflare',
    name:     'Cloudflare Network',
    provider: 'Cloudflare',
    icon:     Shield,
    color:    'orange',
    region:   'Global (300+ PoPs)',
    tier:     'Free plan',
    artifacts: [
      { name: 'WAF Rules',         type: 'config',   desc: 'Reglas de firewall aplicación' },
      { name: 'DDoS Protection',   type: 'runtime',  desc: 'L3/L4/L7 automático' },
      { name: 'SSL/TLS',           type: 'config',   desc: 'Full Strict mode' },
      { name: 'DNS cubancas.tech', type: 'config',   desc: 'Registros CNAME dinámicos' },
      { name: 'CDN Cache',         type: 'runtime',  desc: 'Activos estáticos' },
    ],
    env: ['CF_API_TOKEN', 'CF_ZONE_ID'],
  },
  {
    id:       'vercel',
    name:     'Vercel Platform',
    provider: 'Vercel',
    icon:     Cloud,
    color:    'gray',
    region:   'Washington D.C. (iad1)',
    tier:     'Free plan',
    artifacts: [
      { name: 'React SPA',           type: 'static',   desc: 'Build Vite → /dist',       tech: 'React 18 + TypeScript' },
      { name: 'api/proxy.py',        type: 'function', desc: 'Serverless Python',         tech: 'Python 3.12' },
      { name: 'api/csaas-provision.py', type: 'function', desc: 'Provisión CSaaS',       tech: 'Python 3.12' },
      { name: 'api/status.py',       type: 'function', desc: 'Health check',              tech: 'Python 3.12' },
      { name: 'vercel.json',         type: 'config',   desc: 'Rewrites + CSP headers' },
    ],
    env: ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY', 'VITE_STRIPE_PUBLISHABLE_KEY'],
  },
  {
    id:       'supabase',
    name:     'Supabase Cloud',
    provider: 'Supabase',
    icon:     Database,
    color:    'green',
    region:   'us-east-1 (AWS)',
    tier:     'Free plan',
    artifacts: [
      { name: 'PostgreSQL 15',        type: 'runtime',  desc: '14 tablas + RLS + triggers', tech: 'PostgreSQL' },
      { name: 'GoTrue Auth',          type: 'runtime',  desc: 'JWT + sesiones',              tech: 'GoTrue' },
      { name: 'PostgREST API',        type: 'runtime',  desc: 'REST automático sobre tablas' },
      { name: 'ai-reports',           type: 'function', desc: 'Deno Edge Function',          tech: 'TypeScript + Deno' },
      { name: 'security-services',    type: 'function', desc: 'Deno Edge Function',          tech: 'TypeScript + Deno' },
      { name: 'create-checkout',      type: 'function', desc: 'Deno Edge Function',          tech: 'TypeScript + Deno' },
      { name: 'stripe-webhook',       type: 'function', desc: 'Deno Edge Function',          tech: 'TypeScript + Deno' },
      { name: 'audit-log',            type: 'function', desc: 'Deno Edge Function',          tech: 'TypeScript + Deno' },
    ],
    env: ['SUPABASE_SERVICE_ROLE_KEY', 'DEEPSEEK_API_KEY', 'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'],
  },
  {
    id:       'github',
    name:     'GitHub Repository',
    provider: 'GitHub',
    icon:     GitBranch,
    color:    'purple',
    region:   'Global',
    tier:     'Free plan',
    artifacts: [
      { name: 'Rama main',           type: 'config',  desc: 'Producción — deploy automático' },
      { name: 'src/',                type: 'static',  desc: 'Código fuente React' },
      { name: 'api/',                type: 'static',  desc: 'Funciones Python' },
      { name: 'supabase/functions/', type: 'static',  desc: 'Edge Functions Deno' },
      { name: 'supabase/migrations/',type: 'static',  desc: 'Migraciones SQL' },
    ],
    env: [],
  },
  {
    id:       'stripe',
    name:     'Stripe',
    provider: 'Stripe',
    icon:     Zap,
    color:    'indigo',
    region:   'Global',
    tier:     'Gratuito (test mode)',
    artifacts: [
      { name: 'Checkout Session', type: 'runtime', desc: 'Página de pago segura' },
      { name: 'Webhook Events',   type: 'runtime', desc: 'checkout.session.completed, invoice.payment_failed' },
      { name: '4 Products',       type: 'config',  desc: 'Free / Basic / Pro / Enterprise' },
    ],
    env: [],
  },
  {
    id:       'deepseek',
    name:     'DeepSeek API',
    provider: 'DeepSeek',
    icon:     Code2,
    color:    'blue',
    region:   'Global',
    tier:     'Pay-per-use',
    artifacts: [
      { name: 'deepseek-chat',       type: 'runtime', desc: 'LLM para generación de reportes' },
      { name: 'JSON response format',type: 'config',  desc: 'Garantiza salida estructurada' },
    ],
    env: [],
  },
]

// ─── Conexiones entre nodos ───────────────────────────────────────────────────
const LINKS: DeployLink[] = [
  { from: 'github',    to: 'vercel',    protocol: 'GitHub → Vercel CI/CD',  desc: 'Deploy automático en push a main', secure: true },
  { from: 'cloudflare',to: 'vercel',    protocol: 'HTTPS (proxy)',           desc: 'Tráfico filtrado hacia el frontend y proxy', secure: true },
  { from: 'vercel',    to: 'supabase',  protocol: 'HTTPS REST / WebSocket',  desc: 'Supabase JS SDK + JWT Bearer token', secure: true },
  { from: 'vercel',    to: 'cloudflare',protocol: 'Cloudflare API HTTPS',    desc: 'CSaaS provision — crea registros DNS', secure: true },
  { from: 'supabase',  to: 'stripe',    protocol: 'HTTPS Stripe API',        desc: 'Edge Function crea checkout sessions', secure: true },
  { from: 'stripe',    to: 'supabase',  protocol: 'HTTPS Webhook',           desc: 'Eventos de pago con firma HMAC-SHA256', secure: true },
  { from: 'supabase',  to: 'deepseek',  protocol: 'HTTPS API',               desc: 'Edge Function ai-reports genera reportes', secure: true },
]

// ─── Sub-componentes ──────────────────────────────────────────────────────────
const ARTIFACT_STYLE = {
  runtime:  { color: 'green',  label: 'Runtime'   },
  function: { color: 'blue',   label: 'Function'  },
  static:   { color: 'gray',   label: 'Static'    },
  config:   { color: 'yellow', label: 'Config'    },
}

function NodeCard({ node }: { node: DeployNode }) {
  const [open, setOpen] = useState(false)
  const Icon = node.icon

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white/3 border border-${node.color}-500/20 rounded-2xl overflow-hidden`}
    >
      {/* Header */}
      <button
        onClick={() => setOpen(v => !v)}
        className={`w-full flex items-center gap-3 p-4 hover:bg-${node.color}-500/5 transition-colors text-left`}
      >
        <div className={`w-10 h-10 rounded-xl bg-${node.color}-500/20 border border-${node.color}-500/30 flex items-center justify-center flex-shrink-0`}>
          <Icon className={`w-5 h-5 text-${node.color}-400`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-white font-semibold text-sm">{node.name}</p>
            <span className={`text-xs px-1.5 py-0.5 rounded-full bg-${node.color}-500/10 text-${node.color}-400 border border-${node.color}-500/20`}>
              {node.tier}
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">📍 {node.region}</p>
        </div>
        <motion.div animate={{ rotate: open ? 180 : 0 }}>
          <ChevronDown className="w-4 h-4 text-gray-500" />
        </motion.div>
      </button>

      {/* Artifacts */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className={`border-t border-${node.color}-500/10 p-4 space-y-3`}>
              {/* Artefactos */}
              <div>
                <p className="text-xs text-gray-500 mb-2 font-medium">Artefactos desplegados</p>
                <div className="space-y-1.5">
                  {node.artifacts.map((art, i) => {
                    const st = ARTIFACT_STYLE[art.type]
                    return (
                      <div key={i} className="flex items-start gap-2">
                        <span className={`text-xs px-1.5 py-0.5 rounded bg-${st.color}-500/10 text-${st.color}-400 flex-shrink-0`}>
                          {st.label}
                        </span>
                        <div>
                          <span className="text-xs text-white font-mono">{art.name}</span>
                          {art.tech && <span className="text-xs text-gray-500 ml-2">[{art.tech}]</span>}
                          <p className="text-xs text-gray-500">{art.desc}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Variables de entorno */}
              {node.env.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 mb-2 font-medium flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Variables de entorno requeridas
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {node.env.map((v, i) => (
                      <span key={i} className="text-xs font-mono px-2 py-0.5 rounded bg-black/30 border border-white/10 text-gray-300">
                        {v}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────
export function DeploymentDiagram() {
  const [showLinks, setShowLinks] = useState(true)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-white mb-1">Diagrama de Despliegue</h2>
          <p className="text-gray-400 text-sm">Infraestructura cloud-native — 100% planes gratuitos</p>
        </div>
        <button
          onClick={() => setShowLinks(v => !v)}
          className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${
            showLinks ? 'bg-cyan-500/20 border-cyan-500/30 text-cyan-400' : 'bg-white/5 border-white/10 text-gray-400'
          }`}
        >
          {showLinks ? 'Ocultar enlaces' : 'Ver enlaces'}
        </button>
      </div>

      {/* Pipeline CI/CD */}
      <div className="bg-white/3 border border-purple-500/20 rounded-2xl p-4">
        <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <GitBranch className="w-4 h-4 text-purple-400" />
          Pipeline CI/CD — Deploy automático
        </h3>
        <div className="flex items-center gap-2 flex-wrap text-xs">
          {[
            { label: 'git push main',      color: 'purple', icon: '📤' },
            { label: 'GitHub trigger',     color: 'gray',   icon: '⚡' },
            { label: 'Vercel build (Vite)',color: 'gray',   icon: '🔨' },
            { label: 'Python install',     color: 'gray',   icon: '🐍' },
            { label: 'Deploy CDN + Fns',   color: 'green',  icon: '🚀' },
            { label: 'Vercel URL activa',  color: 'green',  icon: '✅' },
          ].map((s, i, arr) => (
            <div key={i} className="flex items-center gap-2">
              <span className={`px-2.5 py-1.5 rounded-lg bg-${s.color}-500/10 border border-${s.color}-500/20 text-${s.color}-400 font-medium`}>
                {s.icon} {s.label}
              </span>
              {i < arr.length - 1 && <ArrowRight className="w-3 h-3 text-gray-600" />}
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-2">Tiempo promedio de despliegue: ~2 minutos</p>
      </div>

      {/* Nodos */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {NODES.map(node => <NodeCard key={node.id} node={node} />)}
      </div>

      {/* Comunicaciones */}
      <AnimatePresence>
        {showLinks && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="bg-white/3 border border-white/10 rounded-2xl p-4"
          >
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <ArrowRight className="w-4 h-4 text-cyan-400" />
              Comunicaciones entre nodos
            </h3>
            <div className="space-y-2">
              {LINKS.map((link, i) => (
                <div key={i} className="flex items-center gap-3 text-xs bg-white/3 rounded-xl px-3 py-2.5 border border-white/5">
                  <span className="text-cyan-400 font-medium flex-shrink-0">
                    {NODES.find(n => n.id === link.from)?.name ?? link.from}
                  </span>
                  <ArrowRight className="w-3 h-3 text-gray-600 flex-shrink-0" />
                  <span className="text-purple-400 font-medium flex-shrink-0">
                    {NODES.find(n => n.id === link.to)?.name ?? link.to}
                  </span>
                  <span className="text-gray-500 hidden sm:block">·</span>
                  <span className="text-gray-400 hidden sm:block flex-shrink-0">{link.protocol}</span>
                  <span className="ml-auto flex-shrink-0">
                    {link.secure
                      ? <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                      : <AlertTriangle className="w-3.5 h-3.5 text-yellow-400" />
                    }
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Resumen de costos */}
      <div className="bg-white/3 border border-green-500/20 rounded-2xl p-4">
        <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-green-400" />
          Costos de infraestructura (prototipo)
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { provider: 'Cloudflare',  cost: '$0/mes',    note: 'Plan Free'       },
            { provider: 'Vercel',      cost: '$0/mes',    note: 'Plan Hobby'      },
            { provider: 'Supabase',    cost: '$0/mes',    note: 'Plan Free'       },
            { provider: 'GitHub',      cost: '$0/mes',    note: 'Plan Free'       },
            { provider: 'Stripe',      cost: '2.9% + $0.30', note: 'Por transacción' },
            { provider: 'DeepSeek',    cost: '~$0.0004', note: 'Por reporte'     },
          ].map((c, i) => (
            <div key={i} className="text-center p-3 bg-white/3 rounded-xl border border-white/10">
              <p className="text-xs text-gray-400">{c.provider}</p>
              <p className="text-sm font-bold text-green-400 mt-1">{c.cost}</p>
              <p className="text-xs text-gray-500">{c.note}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
