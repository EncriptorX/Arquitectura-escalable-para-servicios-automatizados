/**
 * ProxySequenceDiagram
 * Diagrama de secuencia del flujo del proxy inverso multi-tenant.
 * Muestra el recorrido completo de una request desde el usuario hasta el origen.
 */

import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, Shield, Server, Database, Globe, User, CheckCircle, XCircle, Clock } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────
interface Actor {
  id:    string
  label: string
  icon:  typeof User
  color: string
  desc:  string
}

interface Message {
  from:     string
  to:       string
  label:    string
  sublabel?: string
  type:     'request' | 'response' | 'internal' | 'error' | 'cache'
  timing?:  string
}

// ─── Actores ──────────────────────────────────────────────────────────────────
const ACTORS: Actor[] = [
  { id: 'user',      label: 'Usuario Final',       icon: User,         color: 'blue',   desc: 'Accede via https://cliente-abc123.cubancas.tech' },
  { id: 'cf',        label: 'Cloudflare',           icon: Shield,       color: 'orange', desc: 'WAF, DDoS, SSL/TLS, CDN global' },
  { id: 'proxy',     label: 'Proxy Python',         icon: Server,       color: 'purple', desc: 'Serverless en Vercel — api/proxy.py' },
  { id: 'cache',     label: 'Caché LRU',            icon: Clock,        color: 'yellow', desc: 'Memoria proceso, TTL 60s, max 256 entradas' },
  { id: 'supabase',  label: 'Supabase DB',          icon: Database,     color: 'cyan',   desc: 'Tabla domains — mapeo subdominio→origen' },
  { id: 'origin',    label: 'Servidor Origen',      icon: Globe,        color: 'green',  desc: 'miempresa.com — servidor real del cliente' },
]

// ─── Mensajes del flujo normal ─────────────────────────────────────────────────
const MESSAGES_NORMAL: Message[] = [
  { from: 'user',     to: 'cf',       label: 'GET https://cliente-abc123.cubancas.tech/api/data', type: 'request',  timing: '~0ms'  },
  { from: 'cf',       to: 'proxy',    label: 'Tráfico filtrado (WAF ok, DDoS ok)',  sublabel: 'Header: Host: cliente-abc123.cubancas.tech', type: 'request',  timing: '~15ms' },
  { from: 'proxy',    to: 'cache',    label: 'lookup("cliente-abc123.cubancas.tech")', type: 'internal', timing: '~0ms'  },
  { from: 'cache',    to: 'proxy',    label: 'HIT → "miempresa.com"',              sublabel: 'Sin query a BD — O(1)', type: 'cache',    timing: '~0ms'  },
  { from: 'proxy',    to: 'proxy',    label: 'Validación SSRF — IP pública ✓',     sublabel: 'Bloquea IPs privadas/reservadas', type: 'internal', timing: '~1ms'  },
  { from: 'proxy',    to: 'origin',   label: 'GET https://miempresa.com/api/data', sublabel: 'Headers: Host, X-Forwarded-For, X-Forwarded-Proto', type: 'request',  timing: '~20ms' },
  { from: 'origin',   to: 'proxy',    label: '200 OK + response body',             type: 'response', timing: '~80ms' },
  { from: 'proxy',    to: 'cf',       label: '200 OK + security headers',          sublabel: 'X-Content-Type-Options, X-Frame-Options, HSTS', type: 'response', timing: '~2ms'  },
  { from: 'cf',       to: 'user',     label: '200 OK + CDN cache',                 type: 'response', timing: '~5ms'  },
]

const MESSAGES_CACHE_MISS: Message[] = [
  { from: 'user',    to: 'cf',       label: 'GET https://cliente-nuevo.cubancas.tech/', type: 'request',  timing: '~0ms'  },
  { from: 'cf',      to: 'proxy',    label: 'Tráfico filtrado',                          type: 'request',  timing: '~15ms' },
  { from: 'proxy',   to: 'cache',    label: 'lookup("cliente-nuevo.cubancas.tech")',     type: 'internal', timing: '~0ms'  },
  { from: 'cache',   to: 'proxy',    label: 'MISS — no encontrado en caché',             type: 'error',    timing: '~0ms'  },
  { from: 'proxy',   to: 'supabase', label: 'SELECT domain FROM domains WHERE subdomain = ?', sublabel: 'Query REST con service_role key', type: 'request',  timing: '~5ms'  },
  { from: 'supabase',to: 'proxy',    label: '→ "miempresa-nueva.com"',                  type: 'response', timing: '~30ms' },
  { from: 'proxy',   to: 'cache',    label: 'set("cliente-nuevo...", "miempresa-nueva.com", TTL=60s)', type: 'cache', timing: '~0ms' },
  { from: 'proxy',   to: 'origin',   label: 'GET https://miempresa-nueva.com/',          type: 'request',  timing: '~20ms' },
  { from: 'origin',  to: 'proxy',    label: '200 OK',                                    type: 'response', timing: '~100ms'},
  { from: 'proxy',   to: 'user',     label: '200 OK (via Cloudflare)',                   type: 'response', timing: '~5ms'  },
]

const MESSAGES_ERROR: Message[] = [
  { from: 'user',    to: 'cf',       label: 'GET https://cliente-abc123.cubancas.tech/', type: 'request' },
  { from: 'cf',      to: 'proxy',    label: 'Request forwarded',                          type: 'request' },
  { from: 'proxy',   to: 'cache',    label: 'lookup → MISS',                              type: 'error'   },
  { from: 'proxy',   to: 'supabase', label: 'SELECT domain...',                           type: 'request' },
  { from: 'supabase',to: 'proxy',    label: '→ [] (sin resultados)',                      type: 'response'},
  { from: 'proxy',   to: 'user',     label: '404 {"error":"Subdominio no registrado"}',  type: 'error'   },
]

// ─── Sub-componentes ──────────────────────────────────────────────────────────
const MSG_STYLE = {
  request:  'border-blue-500/40 bg-blue-500/5 text-blue-300',
  response: 'border-green-500/40 bg-green-500/5 text-green-300',
  internal: 'border-gray-500/40 bg-gray-500/5 text-gray-400',
  error:    'border-red-500/40 bg-red-500/5 text-red-300',
  cache:    'border-yellow-500/40 bg-yellow-500/5 text-yellow-300',
}

const MSG_ARROW = {
  request:  '→',
  response: '←',
  internal: '⟳',
  error:    '✗',
  cache:    '⚡',
}

function MessageRow({ msg, actors, idx }: { msg: Message; actors: Actor[]; idx: number }) {
  const fromActor = actors.find(a => a.id === msg.from)
  const toActor   = actors.find(a => a.id === msg.to)
  const style     = MSG_STYLE[msg.type]
  const arrow     = MSG_ARROW[msg.type]
  const isSelf    = msg.from === msg.to

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: idx * 0.06 }}
      className={`flex items-start gap-3 p-3 rounded-xl border ${style} text-xs`}
    >
      {/* Número de paso */}
      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-gray-500 font-mono">
        {idx + 1}
      </span>

      {/* Actores */}
      <div className="flex items-center gap-2 flex-shrink-0 min-w-[140px]">
        <span className={`font-medium text-${fromActor?.color ?? 'gray'}-400`}>
          {fromActor?.label ?? msg.from}
        </span>
        {!isSelf && (
          <>
            <span className="text-gray-600">{arrow}</span>
            <span className={`font-medium text-${toActor?.color ?? 'gray'}-400`}>
              {toActor?.label ?? msg.to}
            </span>
          </>
        )}
      </div>

      {/* Mensaje */}
      <div className="flex-1 min-w-0">
        <p className="font-mono truncate">{msg.label}</p>
        {msg.sublabel && <p className="text-gray-500 mt-0.5 truncate">{msg.sublabel}</p>}
      </div>

      {/* Timing */}
      {msg.timing && (
        <span className="flex-shrink-0 text-gray-600 font-mono">{msg.timing}</span>
      )}
    </motion.div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────
export function ProxySequenceDiagram() {
  const [scenario, setScenario] = useState<'normal' | 'miss' | 'error'>('normal')

  const messages =
    scenario === 'normal' ? MESSAGES_NORMAL :
    scenario === 'miss'   ? MESSAGES_CACHE_MISS :
    MESSAGES_ERROR

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white mb-1">Diagrama de Secuencia — Proxy Inverso</h2>
        <p className="text-gray-400 text-sm">Flujo de una request HTTP a través del proxy multi-tenant</p>
      </div>

      {/* Actores */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {ACTORS.map(a => {
          const Icon = a.icon
          return (
            <div key={a.id} className={`flex flex-col items-center gap-2 p-3 rounded-xl bg-${a.color}-500/10 border border-${a.color}-500/20`}>
              <div className={`w-8 h-8 rounded-xl bg-${a.color}-500/20 flex items-center justify-center`}>
                <Icon className={`w-4 h-4 text-${a.color}-400`} />
              </div>
              <div className="text-center">
                <p className={`text-xs font-semibold text-${a.color}-400`}>{a.label}</p>
                <p className="text-xs text-gray-500 mt-0.5 hidden sm:block">{a.desc}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Selector de escenario */}
      <div className="flex flex-wrap gap-2">
        <span className="text-sm text-gray-400 self-center">Escenario:</span>
        {[
          { id: 'normal', label: '✅ Cache HIT (flujo óptimo)', color: 'green'  },
          { id: 'miss',   label: '🔄 Cache MISS (primera vez)', color: 'yellow' },
          { id: 'error',  label: '❌ Subdominio no registrado', color: 'red'    },
        ].map(s => (
          <button key={s.id} onClick={() => setScenario(s.id as typeof scenario)}
            className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${
              scenario === s.id
                ? `bg-${s.color}-500/20 border-${s.color}-500/30 text-${s.color}-400`
                : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Secuencia */}
      <div className="bg-white/3 border border-white/10 rounded-2xl p-4 space-y-2">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white">Secuencia de mensajes</h3>
          <span className="text-xs text-gray-500">{messages.length} pasos</span>
        </div>
        {messages.map((msg, i) => (
          <MessageRow key={i} msg={msg} actors={ACTORS} idx={i} />
        ))}
      </div>

      {/* Notas técnicas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white/3 border border-white/10 rounded-2xl p-4">
          <h3 className="text-sm font-semibold text-white mb-3">⚡ Optimizaciones implementadas</h3>
          <ul className="space-y-1.5 text-xs text-gray-400">
            {[
              'Caché LRU (256 entradas, TTL 60s) — evita queries repetidas',
              'Reintentos con exponential backoff (máx 2)',
              'Connection pooling implícito (Vercel worker)',
              'Headers X-Forwarded-* correctos para el origen',
              'Validación SSRF antes de cada forward',
            ].map((n, i) => <li key={i} className="flex items-start gap-1.5"><span className="text-cyan-400 flex-shrink-0">▸</span>{n}</li>)}
          </ul>
        </div>
        <div className="bg-white/3 border border-white/10 rounded-2xl p-4">
          <h3 className="text-sm font-semibold text-white mb-3">🔒 Seguridad del proxy</h3>
          <ul className="space-y-1.5 text-xs text-gray-400">
            {[
              'Bloquea IPs privadas/loopback/reservadas (SSRF)',
              'Valida que el subdominio termine en .cubancas.tech',
              'Security headers en todas las respuestas',
              'Host allowlist configurable via ALLOWED_HOSTS',
              'No reenvia headers sensibles al origen',
            ].map((n, i) => <li key={i} className="flex items-start gap-1.5"><span className="text-green-400 flex-shrink-0">▸</span>{n}</li>)}
          </ul>
        </div>
      </div>
    </div>
  )
}
