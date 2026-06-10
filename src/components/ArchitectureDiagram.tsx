/**
 * ArchitectureDiagram
 * Diagrama de componentes interactivo de Cuban CAS.
 * Muestra las 4 capas de la arquitectura con sus relaciones.
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Shield, Globe, Server, Database, Zap, CreditCard,
  Brain, Lock, Users, FileText, Activity, ChevronDown,
  ArrowRight, X, Code2, Cloud,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────
interface Component {
  id:       string
  name:     string
  tech:     string
  desc:     string
  icon:     typeof Shield
  color:    string
  details:  string[]
}

interface Layer {
  id:       string
  label:    string
  sublabel: string
  color:    string
  bg:       string
  border:   string
  components: Component[]
}

// ─── Datos del diagrama ───────────────────────────────────────────────────────
const LAYERS: Layer[] = [
  {
    id:       'client',
    label:    'Capa 1',
    sublabel: 'Cliente / CDN',
    color:    'orange',
    bg:       'bg-orange-500/5',
    border:   'border-orange-500/20',
    components: [
      {
        id:    'cloudflare',
        name:  'Cloudflare',
        tech:  'WAF · DDoS · CDN · SSL/TLS',
        desc:  'Protección perimetral de entrada',
        icon:  Shield,
        color: 'orange',
        details: [
          'Web Application Firewall (WAF)',
          'Protección DDoS automática',
          'CDN global para contenido estático',
          'SSL/TLS automático (modo Full Strict)',
          'Rate limiting y reglas personalizadas',
          'Gestión de subdominios *.cubancas.tech',
        ],
      },
      {
        id:    'browser',
        name:  'Navegador',
        tech:  'React 18 · TypeScript · Vite',
        desc:  'Frontend SPA desplegado en Vercel',
        icon:  Globe,
        color: 'blue',
        details: [
          'React 18 con Concurrent Mode',
          'TypeScript estricto (sin any)',
          'Tailwind CSS + Framer Motion',
          'Autenticación JWT en localStorage',
          'Renderizado condicional por rol (RBAC)',
          'Desplegado en Vercel CDN',
        ],
      },
    ],
  },
  {
    id:       'proxy',
    label:    'Capa 2',
    sublabel: 'Proxy Inverso Multi-Tenant',
    color:    'purple',
    bg:       'bg-purple-500/5',
    border:   'border-purple-500/20',
    components: [
      {
        id:    'proxy',
        name:  'Proxy Python',
        tech:  'Python · Vercel Serverless',
        desc:  'Enruta tráfico subdominio → origen',
        icon:  Server,
        color: 'purple',
        details: [
          'Resolución dinámica subdominio → origen',
          'Caché LRU en memoria (TTL 60s)',
          'Reintentos con exponential backoff',
          'Headers X-Forwarded-* correctos',
          'Validación SSRF (bloquea IPs privadas)',
          'Función serverless en Vercel',
        ],
      },
      {
        id:    'csaas',
        name:  'CSaaS Provision',
        tech:  'Python · Cloudflare API',
        desc:  'Automatiza creación de subdominios',
        icon:  Zap,
        color: 'pink',
        details: [
          'Crea registros CNAME en Cloudflare',
          'Genera subdominios cliente-<id>.cubancas.tech',
          'Configura WAF y reglas de seguridad',
          'Registra mapeo en tabla domains',
          'Activa protección SSL automáticamente',
          'Soporta Custom Hostnames de Cloudflare',
        ],
      },
    ],
  },
  {
    id:       'backend',
    label:    'Capa 3',
    sublabel: 'Backend Serverless (Supabase)',
    color:    'cyan',
    bg:       'bg-cyan-500/5',
    border:   'border-cyan-500/20',
    components: [
      {
        id:    'auth',
        name:  'Supabase Auth',
        tech:  'JWT · GoTrue',
        desc:  'Autenticación y sesiones',
        icon:  Lock,
        color: 'cyan',
        details: [
          'Autenticación email/password',
          'JWT firmados con HS256',
          'Refresh tokens automáticos',
          'Trigger on_auth_user_created',
          'Confirmación por email',
          'Custom JWT claims (org_id, role)',
        ],
      },
      {
        id:    'edge',
        name:  'Edge Functions',
        tech:  'TypeScript · Deno',
        desc:  'Lógica de negocio serverless',
        icon:  Code2,
        color: 'teal',
        details: [
          'auth-middleware (validación JWT)',
          'security-services (escaneos)',
          'ai-reports (generación IA)',
          'create-checkout (Stripe)',
          'stripe-webhook (pagos)',
          'audit-log (trazabilidad)',
          'check-subscriptions (cron)',
        ],
      },
      {
        id:    'db',
        name:  'PostgreSQL',
        tech:  'RLS · Triggers · pl/pgSQL',
        desc:  'Base de datos multi-tenant',
        icon:  Database,
        color: 'green',
        details: [
          '14 tablas con discriminador org_id',
          '20+ políticas RLS (Zero Trust)',
          'Triggers de auditoría automáticos',
          'Función check_plan_limits()',
          'Función get_user_org_context()',
          'Índices parciales sobre org_id',
          'Función sync_organization_plan()',
        ],
      },
    ],
  },
  {
    id:       'external',
    label:    'Capa 4',
    sublabel: 'Servicios Externos',
    color:    'yellow',
    bg:       'bg-yellow-500/5',
    border:   'border-yellow-500/20',
    components: [
      {
        id:    'stripe',
        name:  'Stripe',
        tech:  'Payments · Webhooks',
        desc:  'Monetización SaaS',
        icon:  CreditCard,
        color: 'yellow',
        details: [
          '4 planes: Free / Basic / Pro / Enterprise',
          'Checkout Session seguro',
          'Webhooks con firma HMAC-SHA256',
          'Sincronización automática de estados',
          'Suspensión automática por impago',
          'Tarjeta de prueba: 4242 4242 4242 4242',
        ],
      },
      {
        id:    'deepseek',
        name:  'DeepSeek',
        tech:  'deepseek-chat · JSON mode',
        desc:  'Generación de reportes con IA',
        icon:  Brain,
        color: 'indigo',
        details: [
          'Modelo deepseek-chat',
          'response_format: json_object',
          'Temperatura 0.3 (respuestas consistentes)',
          'Reportes: seguridad, vuln., compliance',
          'Hallazgos priorizados por severidad',
          'Recomendaciones accionables',
        ],
      },
      {
        id:    'vercel',
        name:  'Vercel',
        tech:  'CDN · Serverless · Analytics',
        desc:  'Hosting y despliegue',
        icon:  Cloud,
        color: 'gray',
        details: [
          'Frontend React en CDN global',
          'Funciones serverless Python (proxy)',
          'Deploy automático desde GitHub',
          'Variables de entorno seguras',
          'Web Analytics integrado',
          'HTTPS automático',
        ],
      },
    ],
  },
]

// ─── Conexiones entre capas ───────────────────────────────────────────────────
const CONNECTIONS = [
  { from: 'Cloudflare', to: 'Proxy Python',    label: 'Tráfico limpio'    },
  { from: 'Cloudflare', to: 'Navegador',        label: 'HTTPS / CDN'      },
  { from: 'Navegador',  to: 'Supabase Auth',    label: 'JWT'              },
  { from: 'Navegador',  to: 'Edge Functions',   label: 'API calls'        },
  { from: 'Proxy Python', to: 'PostgreSQL',     label: 'Mapeo subdominios'},
  { from: 'Edge Functions', to: 'PostgreSQL',   label: 'Queries + RLS'   },
  { from: 'Edge Functions', to: 'Stripe',       label: 'Checkout'        },
  { from: 'Edge Functions', to: 'DeepSeek',     label: 'Prompts IA'      },
  { from: 'CSaaS Provision', to: 'Cloudflare',  label: 'API DNS'         },
]

// ─── Componente de tarjeta ────────────────────────────────────────────────────
function ComponentCard({ comp }: { comp: Component }) {
  const [open, setOpen] = useState(false)
  const Icon = comp.icon

  return (
    <div>
      <motion.button
        onClick={() => setOpen(v => !v)}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={`w-full text-left p-4 rounded-2xl border transition-all ${
          open
            ? `bg-${comp.color}-500/15 border-${comp.color}-500/40`
            : `bg-white/5 border-white/10 hover:border-${comp.color}-500/30 hover:bg-white/8`
        }`}
      >
        <div className="flex items-start gap-3">
          <div className={`w-9 h-9 rounded-xl bg-${comp.color}-500/20 border border-${comp.color}-500/30 flex items-center justify-center flex-shrink-0`}>
            <Icon className={`w-4 h-4 text-${comp.color}-400`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <p className="text-white font-semibold text-sm">{comp.name}</p>
              <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
                <ChevronDown className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
              </motion.div>
            </div>
            <p className={`text-xs text-${comp.color}-400 mt-0.5`}>{comp.tech}</p>
            <p className="text-xs text-gray-400 mt-1">{comp.desc}</p>
          </div>
        </div>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className={`mt-1 mx-2 p-3 rounded-xl bg-${comp.color}-500/5 border border-${comp.color}-500/10`}>
              <ul className="space-y-1">
                {comp.details.map((d, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-gray-300">
                    <span className={`text-${comp.color}-400 flex-shrink-0 mt-0.5`}>▸</span>
                    {d}
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────
export function ArchitectureDiagram() {
  const [selectedLayer, setSelectedLayer] = useState<string | null>(null)
  const [showConnections, setShowConnections] = useState(false)

  const visibleLayers = selectedLayer
    ? LAYERS.filter(l => l.id === selectedLayer)
    : LAYERS

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-black to-gray-900 p-6">

      {/* Header */}
      <div className="max-w-6xl mx-auto mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="text-cyan-400 w-7 h-7" />
          <h1 className="text-2xl font-bold text-white">Cuban CAS</h1>
        </div>
        <p className="text-gray-400 text-sm">Diagrama de Componentes — Arquitectura CSaaS Multi-Tenant</p>

        {/* Controles */}
        <div className="flex flex-wrap gap-2 mt-4">
          <button
            onClick={() => setSelectedLayer(null)}
            className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${
              !selectedLayer ? 'bg-white/15 text-white border border-white/20' : 'bg-white/5 text-gray-400 border border-white/10 hover:text-white'
            }`}
          >
            Todas las capas
          </button>
          {LAYERS.map(l => (
            <button
              key={l.id}
              onClick={() => setSelectedLayer(selectedLayer === l.id ? null : l.id)}
              className={`px-3 py-1.5 rounded-lg text-xs transition-colors border ${
                selectedLayer === l.id
                  ? `bg-${l.color}-500/20 text-${l.color}-400 border-${l.color}-500/30`
                  : `bg-white/5 text-gray-400 border-white/10 hover:text-white`
              }`}
            >
              {l.label} — {l.sublabel}
            </button>
          ))}
          <button
            onClick={() => setShowConnections(v => !v)}
            className={`px-3 py-1.5 rounded-lg text-xs transition-colors border ml-auto ${
              showConnections ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' : 'bg-white/5 text-gray-400 border-white/10'
            }`}
          >
            {showConnections ? '▸ Ocultar conexiones' : '▸ Ver conexiones'}
          </button>
        </div>
      </div>

      {/* Diagrama vertical de capas */}
      <div className="max-w-6xl mx-auto space-y-3">
        {visibleLayers.map((layer, layerIdx) => (
          <motion.div
            key={layer.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: layerIdx * 0.08 }}
            className={`rounded-2xl border ${layer.bg} ${layer.border} overflow-hidden`}
          >
            {/* Layer header */}
            <div className={`flex items-center gap-3 px-5 py-3 border-b ${layer.border}`}>
              <div className={`px-2.5 py-1 rounded-lg bg-${layer.color}-500/20 border border-${layer.color}-500/30`}>
                <span className={`text-xs font-bold text-${layer.color}-400`}>{layer.label}</span>
              </div>
              <span className="text-sm font-semibold text-white">{layer.sublabel}</span>
              <span className="ml-auto text-xs text-gray-500">{layer.components.length} componente{layer.components.length !== 1 ? 's' : ''}</span>
            </div>

            {/* Components grid */}
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {layer.components.map(comp => (
                <ComponentCard key={comp.id} comp={comp} />
              ))}
            </div>
          </motion.div>
        ))}

        {/* Flecha entre capas (solo vista completa) */}
        {!selectedLayer && (
          <div className="flex justify-center py-1">
            <div className="flex flex-col items-center gap-1 text-gray-600">
              <ArrowRight className="w-4 h-4 rotate-90" />
            </div>
          </div>
        )}
      </div>

      {/* Panel de conexiones */}
      <AnimatePresence>
        {showConnections && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-2xl px-4"
          >
            <div className="bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-semibold text-sm">Flujo de comunicación entre componentes</h3>
                <button onClick={() => setShowConnections(false)} className="text-gray-500 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {CONNECTIONS.map((conn, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs bg-white/5 rounded-lg px-3 py-2">
                    <span className="text-cyan-400 font-medium truncate">{conn.from}</span>
                    <ArrowRight className="w-3 h-3 text-gray-500 flex-shrink-0" />
                    <span className="text-purple-400 font-medium truncate">{conn.to}</span>
                    <span className="text-gray-500 ml-auto flex-shrink-0">{conn.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Leyenda */}
      <div className="max-w-6xl mx-auto mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
        {LAYERS.map(l => (
          <div key={l.id} className={`flex items-center gap-2 px-3 py-2 rounded-xl ${l.bg} border ${l.border}`}>
            <div className={`w-2 h-2 rounded-full bg-${l.color}-400`} />
            <div>
              <p className={`text-xs font-medium text-${l.color}-400`}>{l.label}</p>
              <p className="text-xs text-gray-500">{l.sublabel}</p>
            </div>
          </div>
        ))}
      </div>

      <p className="text-center text-xs text-gray-600 mt-6">
        Haz clic en cualquier componente para ver sus detalles técnicos
      </p>
    </div>
  )
}
