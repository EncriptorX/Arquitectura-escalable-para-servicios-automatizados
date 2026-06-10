/**
 * AuthFlowDiagram
 * Diagrama de flujo de autenticación Cuban CAS.
 * Muestra el proceso completo de registro, login y control de acceso RBAC.
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  User, Shield, Database, Lock, CheckCircle,
  XCircle, ArrowDown, ArrowRight, AlertTriangle,
  Key, RefreshCw, LogOut, Zap,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────
interface FlowStep {
  id:       string
  label:    string
  sublabel: string
  icon:     typeof User
  color:    string
  type:     'actor' | 'process' | 'decision' | 'db' | 'result'
  details?: string[]
}

interface FlowPath {
  id:     string
  label:  string
  steps:  FlowStep[]
  color:  string
}

// ─── Datos ────────────────────────────────────────────────────────────────────
const REGISTER_FLOW: FlowStep[] = [
  {
    id: 'user-reg', label: 'Usuario', sublabel: 'Completa formulario de registro',
    icon: User, color: 'blue', type: 'actor',
    details: ['Email, contraseña, nombre de organización', 'Validación client-side antes de enviar'],
  },
  {
    id: 'cf-waf', label: 'Cloudflare WAF', sublabel: 'Filtra tráfico malicioso',
    icon: Shield, color: 'orange', type: 'process',
    details: ['Rate limiting: máx 5 intentos/min', 'Bloquea IPs en lista negra', 'Verifica headers HTTP'],
  },
  {
    id: 'supabase-auth', label: 'Supabase Auth', sublabel: 'Crea usuario en auth.users',
    icon: Lock, color: 'cyan', type: 'process',
    details: ['Hash bcrypt de la contraseña', 'Genera UUID v4 para el usuario', 'Envía email de confirmación'],
  },
  {
    id: 'trigger', label: 'Trigger BD', sublabel: 'handle_new_user_registration()',
    icon: Zap, color: 'yellow', type: 'process',
    details: [
      '1. Inserta en user_profiles',
      '2. Crea organización con plan Free',
      '3. Asigna rol admin en organization_members',
      'SECURITY DEFINER — ejecuta con privilegios elevados',
    ],
  },
  {
    id: 'jwt-gen', label: 'JWT Generado', sublabel: 'Token firmado HS256',
    icon: Key, color: 'green', type: 'result',
    details: ['Payload: sub (user_id), role, exp', 'Almacenado en localStorage', 'TTL: 1 hora (refresh automático)'],
  },
  {
    id: 'dashboard', label: 'Dashboard Admin', sublabel: 'Redirige según rol',
    icon: CheckCircle, color: 'green', type: 'result',
    details: ['AuthContext carga perfil + membresía', 'RoleDashboard selecciona vista por rol', 'Permisos RBAC activos'],
  },
]

const LOGIN_FLOW: FlowStep[] = [
  {
    id: 'user-login', label: 'Usuario', sublabel: 'Email + contraseña',
    icon: User, color: 'blue', type: 'actor',
    details: ['Validación de formato email', 'Contraseña mínimo 8 caracteres'],
  },
  {
    id: 'cf-rate', label: 'Cloudflare', sublabel: 'Rate limiting aplicado',
    icon: Shield, color: 'orange', type: 'process',
    details: ['Máx 10 intentos de login / 5 min', 'Bloqueo temporal por IP'],
  },
  {
    id: 'verify-creds', label: 'Verificar credenciales', sublabel: 'Supabase Auth valida',
    icon: Lock, color: 'cyan', type: 'decision',
    details: ['Compara hash bcrypt', 'Verifica email confirmado', 'Comprueba cuenta activa'],
  },
  {
    id: 'load-ctx', label: 'Cargar contexto', sublabel: 'AuthContext → Supabase DB',
    icon: Database, color: 'teal', type: 'process',
    details: [
      'Query 1: user_profiles (perfil)',
      'Query 2: organization_members + organizations',
      'Query 3: subscriptions + plans (opcional)',
      'RLS evalúa auth.uid() en cada query',
    ],
  },
  {
    id: 'rbac-check', label: 'Control RBAC', sublabel: 'Determina vista según rol',
    icon: Key, color: 'purple', type: 'decision',
    details: ['admin → AdminDashboard', 'coordinator → CoordinatorDashboard', 'analyst → AnalystDashboard', 'viewer → ViewerDashboard'],
  },
  {
    id: 'success', label: 'Acceso concedido', sublabel: 'Dashboard cargado',
    icon: CheckCircle, color: 'green', type: 'result',
    details: ['Sesión persistida en localStorage', 'INITIAL_SESSION restaura en recarga', 'Token se refresca automáticamente'],
  },
]

const ERROR_PATHS = [
  { from: 'verify-creds', label: 'Credenciales inválidas', result: 'Error 401 — "Invalid login credentials"', color: 'red' },
  { from: 'verify-creds', label: 'Email no confirmado',    result: 'Error 400 — "Email not confirmed"',        color: 'yellow' },
  { from: 'load-ctx',     label: 'Sin membresía activa',  result: 'Redirige a OnboardingPage',                 color: 'yellow' },
]

// ─── Sub-componentes ──────────────────────────────────────────────────────────
function Step({ step, index, total }: { step: FlowStep; index: number; total: number }) {
  const [open, setOpen] = useState(false)
  const Icon = step.icon
  const isLast = index === total - 1

  const shapeClass =
    step.type === 'decision' ? 'rounded-none rotate-45 w-10 h-10' :
    step.type === 'db'       ? 'rounded-sm'                        :
    'rounded-2xl'

  return (
    <div className="flex flex-col items-center">
      <motion.button
        onClick={() => setOpen(v => !v)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={`relative flex flex-col items-center gap-2 group`}
      >
        {/* Shape */}
        <div className={`
          w-14 h-14 flex items-center justify-center
          bg-${step.color}-500/20 border-2 border-${step.color}-500/50
          shadow-lg shadow-${step.color}-500/10
          ${step.type === 'decision' ? 'rotate-45' : 'rounded-2xl'}
          transition-all group-hover:bg-${step.color}-500/30 group-hover:border-${step.color}-500/70
        `}>
          <Icon className={`w-6 h-6 text-${step.color}-400 ${step.type === 'decision' ? '-rotate-45' : ''}`} />
        </div>

        {/* Label */}
        <div className="text-center">
          <p className="text-white text-xs font-semibold">{step.label}</p>
          <p className="text-gray-400 text-xs mt-0.5 max-w-[100px]">{step.sublabel}</p>
        </div>

        {/* Indicador de detalle */}
        {step.details && (
          <div className={`w-1.5 h-1.5 rounded-full bg-${step.color}-400`} />
        )}
      </motion.button>

      {/* Detalles expandibles */}
      <AnimatePresence>
        {open && step.details && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className={`mt-2 p-3 rounded-xl bg-${step.color}-500/10 border border-${step.color}-500/20 w-48 text-left`}
          >
            <ul className="space-y-1">
              {step.details.map((d, i) => (
                <li key={i} className={`text-xs text-${step.color}-300 flex items-start gap-1.5`}>
                  <span className="flex-shrink-0 mt-0.5">▸</span>{d}
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Flecha hacia abajo (excepto en el último) */}
      {!isLast && (
        <motion.div
          animate={{ y: [0, 4, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="my-2"
        >
          <ArrowDown className="w-4 h-4 text-gray-600" />
        </motion.div>
      )}
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────
export function AuthFlowDiagram() {
  const [activeFlow, setActiveFlow] = useState<'register' | 'login'>('login')

  const flow = activeFlow === 'register' ? REGISTER_FLOW : LOGIN_FLOW

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white mb-1">Flujo de Autenticación</h2>
        <p className="text-gray-400 text-sm">Proceso completo desde el cliente hasta la base de datos con Zero Trust</p>
      </div>

      {/* Toggle registro / login */}
      <div className="flex gap-2">
        {(['login', 'register'] as const).map(f => (
          <button key={f} onClick={() => setActiveFlow(f)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
              activeFlow === f
                ? 'bg-cyan-500/20 border-cyan-500/30 text-cyan-400'
                : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
            }`}
          >
            {f === 'login' ? '🔑 Inicio de sesión' : '📝 Registro'}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Flujo principal */}
        <div className="lg:col-span-2 bg-white/3 border border-white/10 rounded-2xl p-6">
          <h3 className="text-sm font-semibold text-gray-300 mb-6 flex items-center gap-2">
            <ArrowDown className="w-4 h-4 text-cyan-400" />
            Flujo principal — {activeFlow === 'login' ? 'Autenticación' : 'Registro'}
          </h3>

          <div className="flex flex-col items-center">
            {flow.map((step, i) => (
              <Step key={step.id} step={step} index={i} total={flow.length} />
            ))}
          </div>

          <p className="text-center text-xs text-gray-600 mt-4">
            Haz clic en cada paso para ver detalles técnicos
          </p>
        </div>

        {/* Panel derecho */}
        <div className="space-y-4">

          {/* Caminos de error */}
          <div className="bg-white/3 border border-white/10 rounded-2xl p-4">
            <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
              <XCircle className="w-4 h-4 text-red-400" />
              Manejo de errores
            </h3>
            <div className="space-y-2">
              {ERROR_PATHS.map((ep, i) => (
                <div key={i} className={`p-3 rounded-xl bg-${ep.color}-500/10 border border-${ep.color}-500/20`}>
                  <p className={`text-xs font-medium text-${ep.color}-400`}>{ep.label}</p>
                  <p className="text-xs text-gray-400 mt-1">{ep.result}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Principios de seguridad */}
          <div className="bg-white/3 border border-white/10 rounded-2xl p-4">
            <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
              <Shield className="w-4 h-4 text-cyan-400" />
              Principios Zero Trust
            </h3>
            <div className="space-y-2">
              {[
                { icon: '🔐', title: 'Verificación explícita', desc: 'JWT validado en cada request' },
                { icon: '🎯', title: 'Mínimo privilegio', desc: 'RBAC + RLS por rol y org' },
                { icon: '🚫', title: 'Nunca confiar', desc: 'RLS activo aunque session sea válida' },
                { icon: '📋', title: 'Audit Everything', desc: 'Cada acción en audit_logs' },
              ].map((p, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-base">{p.icon}</span>
                  <div>
                    <p className="text-xs font-medium text-white">{p.title}</p>
                    <p className="text-xs text-gray-500">{p.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Roles */}
          <div className="bg-white/3 border border-white/10 rounded-2xl p-4">
            <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
              <Key className="w-4 h-4 text-purple-400" />
              Roles RBAC
            </h3>
            <div className="space-y-1.5">
              {[
                { role: 'admin',       color: 'red',    perms: 'Acceso total' },
                { role: 'coordinator', color: 'purple', perms: 'Dominios + servicios' },
                { role: 'analyst',     color: 'blue',   perms: 'Escaneos + reportes' },
                { role: 'viewer',      color: 'gray',   perms: 'Solo lectura' },
              ].map(r => (
                <div key={r.role} className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-${r.color}-500/10 border border-${r.color}-500/20`}>
                  <span className={`w-1.5 h-1.5 rounded-full bg-${r.color}-400`} />
                  <span className={`text-xs font-medium text-${r.color}-400 capitalize`}>{r.role}</span>
                  <span className="text-xs text-gray-500 ml-auto">{r.perms}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
