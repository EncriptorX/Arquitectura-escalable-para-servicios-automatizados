/**
 * ERDiagram
 * Diagrama Entidad-Relación (DER) interactivo de Cuban CAS.
 * Muestra las 14 tablas, sus atributos y relaciones.
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Database, Key, Link, X, ChevronDown, ChevronUp } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────
interface Column {
  name:     string
  type:     string
  pk?:      boolean   // Primary Key
  fk?:      string    // Foreign Key → tabla.columna
  uk?:      boolean   // Unique
  nn?:      boolean   // Not Null
  default?: string
  desc?:    string
}

interface ERTable {
  id:       string
  name:     string
  desc:     string
  color:    string
  group:    'core' | 'billing' | 'security' | 'audit' | 'public'
  columns:  Column[]
}

interface Relation {
  from:       string   // tabla.columna
  to:         string   // tabla.columna
  type:       '1:N' | 'N:1' | 'N:N' | '1:1'
  label?:     string
  optional?:  boolean
}

// ─── Colores por grupo ────────────────────────────────────────────────────────
const GROUP_CONFIG = {
  core:     { color: 'cyan',   label: 'Núcleo Multi-Tenant' },
  billing:  { color: 'yellow', label: 'Facturación'         },
  security: { color: 'purple', label: 'Seguridad'           },
  audit:    { color: 'red',    label: 'Auditoría'           },
  public:   { color: 'green',  label: 'Público'             },
}

// ─── Tablas ───────────────────────────────────────────────────────────────────
const TABLES: ERTable[] = [
  {
    id: 'organizations', name: 'organizations', desc: 'Tenants del sistema', color: 'cyan', group: 'core',
    columns: [
      { name: 'id',                 type: 'UUID',        pk: true,                  desc: 'Identificador único' },
      { name: 'name',               type: 'TEXT',        nn: true,                  desc: 'Nombre de la organización' },
      { name: 'slug',               type: 'TEXT',        nn: true, uk: true,        desc: 'Identificador URL único' },
      { name: 'domain',             type: 'TEXT',                                   desc: 'Dominio principal' },
      { name: 'plan',               type: 'TEXT',        nn: true, default: 'free', desc: 'free|basic|pro|enterprise' },
      { name: 'status',             type: 'TEXT',        nn: true, default: 'active' },
      { name: 'stripe_customer_id', type: 'TEXT',        uk: true },
      { name: 'billing_email',      type: 'TEXT' },
      { name: 'settings',           type: 'JSONB',       default: '{}' },
      { name: 'security_config',    type: 'JSONB',       default: '{}' },
      { name: 'created_at',         type: 'TIMESTAMPTZ', default: 'NOW()' },
      { name: 'updated_at',         type: 'TIMESTAMPTZ', default: 'NOW()' },
    ],
  },
  {
    id: 'user_profiles', name: 'user_profiles', desc: 'Perfiles de usuarios autenticados', color: 'cyan', group: 'core',
    columns: [
      { name: 'id',                    type: 'UUID',        pk: true, fk: 'auth.users.id', desc: 'Referencia a auth.users' },
      { name: 'full_name',             type: 'TEXT' },
      { name: 'email',                 type: 'TEXT' },
      { name: 'avatar_url',            type: 'TEXT' },
      { name: 'phone',                 type: 'TEXT' },
      { name: 'two_factor_enabled',    type: 'BOOLEAN',     default: 'false' },
      { name: 'security_notifications',type: 'BOOLEAN',     default: 'true' },
      { name: 'timezone',              type: 'TEXT',        default: 'UTC' },
      { name: 'language',              type: 'TEXT',        default: 'es' },
      { name: 'last_login_at',         type: 'TIMESTAMPTZ' },
      { name: 'created_at',            type: 'TIMESTAMPTZ', default: 'NOW()' },
      { name: 'updated_at',            type: 'TIMESTAMPTZ', default: 'NOW()' },
    ],
  },
  {
    id: 'organization_members', name: 'organization_members', desc: 'Membresías y roles (corazón del multi-tenant)', color: 'cyan', group: 'core',
    columns: [
      { name: 'id',              type: 'UUID',        pk: true },
      { name: 'organization_id', type: 'UUID',        nn: true, fk: 'organizations.id', desc: 'CASCADE DELETE' },
      { name: 'user_id',         type: 'UUID',        nn: true, fk: 'user_profiles.id', desc: 'CASCADE DELETE' },
      { name: 'role',            type: 'TEXT',        nn: true, desc: 'admin|coordinator|analyst|viewer' },
      { name: 'permissions',     type: 'JSONB',       default: '[]', desc: 'Array de permisos granulares' },
      { name: 'status',          type: 'TEXT',        nn: true, default: 'active', desc: 'active|inactive|invited|suspended' },
      { name: 'invited_by',      type: 'UUID',        fk: 'auth.users.id' },
      { name: 'invited_at',      type: 'TIMESTAMPTZ' },
      { name: 'invitation_token',type: 'TEXT',        uk: true },
      { name: 'joined_at',       type: 'TIMESTAMPTZ', default: 'NOW()' },
      { name: 'created_at',      type: 'TIMESTAMPTZ', default: 'NOW()' },
      { name: 'updated_at',      type: 'TIMESTAMPTZ', default: 'NOW()' },
      { name: '— UNIQUE',        type: '(organization_id, user_id)', desc: 'Un usuario por organización' },
    ],
  },
  {
    id: 'plans', name: 'plans', desc: 'Planes de suscripción disponibles', color: 'yellow', group: 'billing',
    columns: [
      { name: 'id',                    type: 'UUID',         pk: true },
      { name: 'name',                  type: 'TEXT',         nn: true, uk: true },
      { name: 'slug',                  type: 'TEXT',         nn: true, uk: true, desc: 'free|basic|pro|enterprise' },
      { name: 'description',           type: 'TEXT' },
      { name: 'price_monthly',         type: 'DECIMAL(10,2)', default: '0' },
      { name: 'price_yearly',          type: 'DECIMAL(10,2)', default: '0' },
      { name: 'max_domains',           type: 'INTEGER',      default: '1' },
      { name: 'max_scans_per_month',   type: 'INTEGER',      default: '10' },
      { name: 'max_reports_per_month', type: 'INTEGER',      default: '5' },
      { name: 'max_users',             type: 'INTEGER',      default: '1' },
      { name: 'enabled_services',      type: 'JSONB',        default: '[]' },
      { name: 'features',              type: 'JSONB',        default: '{}' },
      { name: 'stripe_price_id_monthly', type: 'TEXT' },
      { name: 'stripe_price_id_yearly',  type: 'TEXT' },
      { name: 'active',                type: 'BOOLEAN',      default: 'true' },
      { name: 'created_at',            type: 'TIMESTAMPTZ',  default: 'NOW()' },
      { name: 'updated_at',            type: 'TIMESTAMPTZ',  default: 'NOW()' },
    ],
  },
  {
    id: 'subscriptions', name: 'subscriptions', desc: 'Suscripciones activas por organización', color: 'yellow', group: 'billing',
    columns: [
      { name: 'id',                   type: 'UUID',         pk: true },
      { name: 'organization_id',      type: 'UUID',         nn: true, fk: 'organizations.id', desc: 'CASCADE DELETE' },
      { name: 'plan_id',              type: 'UUID',         nn: true, fk: 'plans.id' },
      { name: 'status',               type: 'TEXT',         nn: true, desc: 'active|canceled|past_due|unpaid|trialing' },
      { name: 'billing_cycle',        type: 'TEXT',         nn: true, default: 'monthly' },
      { name: 'stripe_subscription_id', type: 'TEXT',       uk: true },
      { name: 'stripe_customer_id',   type: 'TEXT' },
      { name: 'current_period_start', type: 'TIMESTAMPTZ' },
      { name: 'current_period_end',   type: 'TIMESTAMPTZ' },
      { name: 'trial_end',            type: 'TIMESTAMPTZ' },
      { name: 'canceled_at',          type: 'TIMESTAMPTZ' },
      { name: 'created_at',           type: 'TIMESTAMPTZ',  default: 'NOW()' },
      { name: 'updated_at',           type: 'TIMESTAMPTZ',  default: 'NOW()' },
    ],
  },
  {
    id: 'invoices', name: 'invoices', desc: 'Historial de facturas', color: 'yellow', group: 'billing',
    columns: [
      { name: 'id',               type: 'UUID',         pk: true },
      { name: 'organization_id',  type: 'UUID',         nn: true, fk: 'organizations.id' },
      { name: 'subscription_id',  type: 'UUID',         fk: 'subscriptions.id' },
      { name: 'stripe_invoice_id',type: 'TEXT',         uk: true },
      { name: 'invoice_number',   type: 'TEXT' },
      { name: 'amount_due',       type: 'INTEGER',      nn: true, desc: 'En centavos USD' },
      { name: 'amount_paid',      type: 'INTEGER',      default: '0' },
      { name: 'currency',         type: 'TEXT',         default: 'USD' },
      { name: 'status',           type: 'TEXT',         nn: true, desc: 'draft|open|paid|void|uncollectible' },
      { name: 'period_start',     type: 'TIMESTAMPTZ' },
      { name: 'period_end',       type: 'TIMESTAMPTZ' },
      { name: 'paid_at',          type: 'TIMESTAMPTZ' },
      { name: 'created_at',       type: 'TIMESTAMPTZ',  default: 'NOW()' },
      { name: 'updated_at',       type: 'TIMESTAMPTZ',  default: 'NOW()' },
    ],
  },
  {
    id: 'domains', name: 'domains', desc: 'Dominios protegidos por organización', color: 'purple', group: 'security',
    columns: [
      { name: 'id',                      type: 'UUID',        pk: true },
      { name: 'organization_id',         type: 'UUID',        nn: true, fk: 'organizations.id', desc: 'CASCADE DELETE' },
      { name: 'domain',                  type: 'TEXT',        nn: true },
      { name: 'subdomain',               type: 'TEXT' },
      { name: 'status',                  type: 'TEXT',        nn: true, default: 'active', desc: 'active|inactive|pending|error' },
      { name: 'verification_status',     type: 'TEXT',        default: 'pending', desc: 'pending|verified|failed' },
      { name: 'security_config',         type: 'JSONB',       default: '{}' },
      { name: 'cloudflare_zone_id',      type: 'TEXT' },
      { name: 'cloudflare_dns_record_id',type: 'TEXT' },
      { name: 'created_at',              type: 'TIMESTAMPTZ', default: 'NOW()' },
      { name: 'updated_at',              type: 'TIMESTAMPTZ', default: 'NOW()' },
      { name: '— UNIQUE',                type: '(organization_id, domain)' },
    ],
  },
  {
    id: 'security_services', name: 'security_services', desc: 'Catálogo de servicios disponibles', color: 'purple', group: 'security',
    columns: [
      { name: 'id',                   type: 'UUID',         pk: true },
      { name: 'name',                 type: 'TEXT',         nn: true },
      { name: 'slug',                 type: 'TEXT',         nn: true, uk: true },
      { name: 'description',          type: 'TEXT' },
      { name: 'service_type',         type: 'TEXT',         nn: true, desc: 'perimeter|vulnerability|performance|security|compliance' },
      { name: 'default_config',       type: 'JSONB',        default: '{}' },
      { name: 'required_permissions', type: 'JSONB',        default: '[]' },
      { name: 'cost_per_execution',   type: 'DECIMAL(10,4)',default: '0' },
      { name: 'execution_time_limit', type: 'INTEGER',      default: '300', desc: 'segundos' },
      { name: 'active',               type: 'BOOLEAN',      default: 'true' },
      { name: 'created_at',           type: 'TIMESTAMPTZ',  default: 'NOW()' },
      { name: 'updated_at',           type: 'TIMESTAMPTZ',  default: 'NOW()' },
    ],
  },
  {
    id: 'service_executions', name: 'service_executions', desc: 'Historial de ejecuciones de servicios', color: 'purple', group: 'security',
    columns: [
      { name: 'id',                      type: 'UUID',        pk: true },
      { name: 'organization_id',         type: 'UUID',        nn: true, fk: 'organizations.id' },
      { name: 'domain_id',               type: 'UUID',        nn: true, fk: 'domains.id', desc: 'CASCADE DELETE' },
      { name: 'service_id',              type: 'UUID',        nn: true, fk: 'security_services.id' },
      { name: 'status',                  type: 'TEXT',        nn: true, default: 'pending', desc: 'pending|running|completed|failed|canceled' },
      { name: 'config',                  type: 'JSONB',       default: '{}' },
      { name: 'results',                 type: 'JSONB' },
      { name: 'error_message',           type: 'TEXT' },
      { name: 'started_at',              type: 'TIMESTAMPTZ' },
      { name: 'completed_at',            type: 'TIMESTAMPTZ' },
      { name: 'execution_time_seconds',  type: 'INTEGER' },
      { name: 'triggered_by',            type: 'TEXT',        nn: true, default: 'manual', desc: 'manual|schedule|api|retry' },
      { name: 'triggered_by_user_id',    type: 'UUID',        fk: 'auth.users.id' },
      { name: 'parent_execution_id',     type: 'UUID',        fk: 'service_executions.id' },
      { name: 'created_at',              type: 'TIMESTAMPTZ', default: 'NOW()' },
      { name: 'updated_at',              type: 'TIMESTAMPTZ', default: 'NOW()' },
    ],
  },
  {
    id: 'reports', name: 'reports', desc: 'Reportes generados con IA (DeepSeek)', color: 'purple', group: 'security',
    columns: [
      { name: 'id',              type: 'UUID',        pk: true },
      { name: 'organization_id', type: 'UUID',        nn: true, fk: 'organizations.id' },
      { name: 'domain_id',       type: 'UUID',        fk: 'domains.id', desc: 'CASCADE DELETE' },
      { name: 'title',           type: 'TEXT',        nn: true },
      { name: 'report_type',     type: 'TEXT',        nn: true, desc: 'security|vulnerability|performance|compliance|comprehensive' },
      { name: 'format',          type: 'TEXT',        nn: true, default: 'html', desc: 'pdf|html|json' },
      { name: 'summary',         type: 'TEXT' },
      { name: 'findings',        type: 'JSONB',       default: '[]', desc: '[{title,severity,description,evidence,impact}]' },
      { name: 'recommendations', type: 'JSONB',       default: '[]', desc: '[{title,priority,description,implementation}]' },
      { name: 'status',          type: 'TEXT',        nn: true, default: 'generating', desc: 'generating|completed|failed' },
      { name: 'generated_by_ai', type: 'BOOLEAN',     default: 'true' },
      { name: 'file_url',        type: 'TEXT' },
      { name: 'file_size',       type: 'INTEGER' },
      { name: 'generated_at',    type: 'TIMESTAMPTZ' },
      { name: 'regenerated_at',  type: 'TIMESTAMPTZ' },
      { name: 'error_message',   type: 'TEXT' },
      { name: 'created_at',      type: 'TIMESTAMPTZ', default: 'NOW()' },
      { name: 'updated_at',      type: 'TIMESTAMPTZ', default: 'NOW()' },
    ],
  },
  {
    id: 'usage_records', name: 'usage_records', desc: 'Registro de consumo de recursos', color: 'yellow', group: 'billing',
    columns: [
      { name: 'id',              type: 'UUID',        pk: true },
      { name: 'organization_id', type: 'UUID',        nn: true, fk: 'organizations.id' },
      { name: 'subscription_id', type: 'UUID',        fk: 'subscriptions.id' },
      { name: 'resource_type',   type: 'TEXT',        nn: true, desc: 'scan|report|domain|user|api_call' },
      { name: 'quantity',        type: 'INTEGER',     nn: true, default: '1' },
      { name: 'metadata',        type: 'JSONB',       default: '{}' },
      { name: 'recorded_at',     type: 'TIMESTAMPTZ', default: 'NOW()' },
    ],
  },
  {
    id: 'notifications', name: 'notifications', desc: 'Notificaciones del sistema', color: 'cyan', group: 'core',
    columns: [
      { name: 'id',              type: 'UUID',        pk: true },
      { name: 'organization_id', type: 'UUID',        nn: true, fk: 'organizations.id' },
      { name: 'user_id',         type: 'UUID',        fk: 'auth.users.id', desc: 'NULL = org-wide' },
      { name: 'subject',         type: 'TEXT',        nn: true },
      { name: 'body',            type: 'TEXT',        nn: true },
      { name: 'type',            type: 'TEXT',        nn: true, desc: 'info|warning|error|success' },
      { name: 'category',        type: 'TEXT',        desc: 'security|billing|system|report' },
      { name: 'delivery_method', type: 'TEXT',        nn: true, default: 'in_app', desc: 'in_app|email|both' },
      { name: 'status',          type: 'TEXT',        nn: true, default: 'pending', desc: 'pending|sent|read|failed' },
      { name: 'metadata',        type: 'JSONB',       default: '{}' },
      { name: 'read_at',         type: 'TIMESTAMPTZ' },
      { name: 'sent_at',         type: 'TIMESTAMPTZ' },
      { name: 'created_at',      type: 'TIMESTAMPTZ', default: 'NOW()' },
    ],
  },
  {
    id: 'audit_logs', name: 'audit_logs', desc: 'Trazabilidad completa de acciones', color: 'red', group: 'audit',
    columns: [
      { name: 'id',              type: 'UUID',        pk: true },
      { name: 'organization_id', type: 'UUID',        fk: 'organizations.id' },
      { name: 'user_id',         type: 'UUID',        fk: 'auth.users.id' },
      { name: 'action',          type: 'TEXT',        nn: true },
      { name: 'resource_type',   type: 'TEXT',        nn: true },
      { name: 'resource_id',     type: 'UUID' },
      { name: 'action_result',   type: 'TEXT',        nn: true, default: 'success', desc: 'success|failure|denied' },
      { name: 'severity',        type: 'TEXT',        nn: true, default: 'info', desc: 'info|warning|critical' },
      { name: 'category',        type: 'TEXT',        nn: true, default: 'system', desc: 'auth|data|security|billing|admin|system' },
      { name: 'ip_address',      type: 'INET' },
      { name: 'user_agent',      type: 'TEXT' },
      { name: 'session_id',      type: 'TEXT' },
      { name: 'metadata',        type: 'JSONB',       default: '{}' },
      { name: 'created_at',      type: 'TIMESTAMPTZ', default: 'NOW()' },
    ],
  },
  {
    id: 'service_requests', name: 'service_requests', desc: 'Formulario público de solicitudes', color: 'green', group: 'public',
    columns: [
      { name: 'id',           type: 'UUID',        pk: true },
      { name: 'company_name', type: 'TEXT',        nn: true },
      { name: 'contact_name', type: 'TEXT',        nn: true },
      { name: 'email',        type: 'TEXT',        nn: true },
      { name: 'phone',        type: 'TEXT' },
      { name: 'urls',         type: 'TEXT[]',      nn: true, default: '{}' },
      { name: 'comments',     type: 'TEXT' },
      { name: 'status',       type: 'TEXT',        nn: true, default: 'pending' },
      { name: 'created_at',   type: 'TIMESTAMPTZ', default: 'NOW()' },
    ],
  },
]

// ─── Relaciones ───────────────────────────────────────────────────────────────
const RELATIONS: Relation[] = [
  { from: 'organizations.id',         to: 'organization_members.organization_id', type: '1:N', label: 'tiene' },
  { from: 'user_profiles.id',         to: 'organization_members.user_id',         type: '1:N', label: 'pertenece' },
  { from: 'organizations.id',         to: 'subscriptions.organization_id',        type: '1:N', label: 'suscribe' },
  { from: 'plans.id',                 to: 'subscriptions.plan_id',                type: '1:N', label: 'define' },
  { from: 'organizations.id',         to: 'domains.organization_id',              type: '1:N', label: 'registra' },
  { from: 'organizations.id',         to: 'service_executions.organization_id',   type: '1:N', label: 'ejecuta' },
  { from: 'domains.id',               to: 'service_executions.domain_id',         type: '1:N', label: 'analiza' },
  { from: 'security_services.id',     to: 'service_executions.service_id',        type: '1:N', label: 'usa' },
  { from: 'organizations.id',         to: 'reports.organization_id',              type: '1:N', label: 'genera' },
  { from: 'domains.id',               to: 'reports.domain_id',                    type: '1:N', label: 'sobre', optional: true },
  { from: 'organizations.id',         to: 'usage_records.organization_id',        type: '1:N', label: 'registra' },
  { from: 'subscriptions.id',         to: 'usage_records.subscription_id',        type: '1:N', label: 'vincula', optional: true },
  { from: 'organizations.id',         to: 'invoices.organization_id',             type: '1:N', label: 'factura' },
  { from: 'subscriptions.id',         to: 'invoices.subscription_id',             type: '1:N', label: 'genera', optional: true },
  { from: 'organizations.id',         to: 'notifications.organization_id',        type: '1:N', label: 'notifica' },
  { from: 'organizations.id',         to: 'audit_logs.organization_id',           type: '1:N', label: 'registra', optional: true },
]

// ─── Sub-componentes ──────────────────────────────────────────────────────────
function TableCard({ table, isSelected, onSelect }: {
  table:      ERTable
  isSelected: boolean
  onSelect:   (id: string | null) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const cfg = GROUP_CONFIG[table.group]
  const pkCols  = table.columns.filter(c => c.pk)
  const fkCols  = table.columns.filter(c => c.fk)
  const regCols = table.columns.filter(c => !c.pk && !c.fk && !c.name.startsWith('—'))

  return (
    <motion.div
      layout
      onClick={() => onSelect(isSelected ? null : table.id)}
      className={`rounded-2xl border cursor-pointer transition-all ${
        isSelected
          ? `bg-${table.color}-500/15 border-${table.color}-500/50 shadow-lg shadow-${table.color}-500/10`
          : `bg-white/3 border-white/10 hover:border-${table.color}-500/30 hover:bg-white/5`
      }`}
    >
      {/* Header */}
      <div className="flex items-center gap-3 p-3">
        <div className={`w-8 h-8 rounded-xl bg-${table.color}-500/20 border border-${table.color}-500/30 flex items-center justify-center flex-shrink-0`}>
          <Database className={`w-4 h-4 text-${table.color}-400`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-bold text-${table.color}-400 font-mono`}>{table.name}</p>
          <p className="text-xs text-gray-500 truncate">{table.desc}</p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className={`text-xs px-1.5 py-0.5 rounded bg-${cfg.color}-500/10 text-${cfg.color}-400 border border-${cfg.color}-500/20`}>
            {cfg.label}
          </span>
          <button
            onClick={e => { e.stopPropagation(); setExpanded(v => !v) }}
            className="text-gray-500 hover:text-white transition-colors"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Quick stats */}
      <div className="px-3 pb-2 flex items-center gap-3 text-xs text-gray-500">
        <span className="flex items-center gap-1"><Key className="w-3 h-3 text-yellow-400" />{pkCols.length} PK</span>
        <span className="flex items-center gap-1"><Link className="w-3 h-3 text-blue-400" />{fkCols.length} FK</span>
        <span>{table.columns.length} columnas</span>
      </div>

      {/* Columnas expandibles */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className={`border-t border-${table.color}-500/10 p-3`}>
              {/* PK */}
              {pkCols.map(c => (
                <div key={c.name} className="flex items-center gap-2 py-1 text-xs border-b border-white/5">
                  <Key className="w-3 h-3 text-yellow-400 flex-shrink-0" title="Primary Key" />
                  <span className="font-mono text-white font-medium w-36 truncate">{c.name}</span>
                  <span className="text-gray-500 flex-1">{c.type}</span>
                  {c.desc && <span className="text-gray-600 truncate max-w-24">{c.desc}</span>}
                </div>
              ))}
              {/* FK */}
              {fkCols.map(c => (
                <div key={c.name} className="flex items-center gap-2 py-1 text-xs border-b border-white/5">
                  <Link className="w-3 h-3 text-blue-400 flex-shrink-0" title={`FK → ${c.fk}`} />
                  <span className="font-mono text-blue-300 w-36 truncate">{c.name}</span>
                  <span className="text-gray-500 flex-1">{c.type}</span>
                  <span className="text-blue-500 truncate max-w-32">→ {c.fk}</span>
                </div>
              ))}
              {/* Regular */}
              {regCols.slice(0, expanded ? undefined : 4).map(c => (
                <div key={c.name} className="flex items-center gap-2 py-1 text-xs border-b border-white/5 last:border-0">
                  <span className="w-3 h-3 flex-shrink-0" />
                  <span className={`font-mono w-36 truncate ${c.uk ? 'text-yellow-300' : 'text-gray-300'}`}>
                    {c.name}{c.uk ? ' 🔑' : ''}{c.nn ? ' *' : ''}
                  </span>
                  <span className="text-gray-500 flex-1">{c.type}</span>
                  {c.default && <span className="text-gray-600 truncate max-w-20">={c.default}</span>}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────
export function ERDiagram() {
  const [selectedTable, setSelectedTable] = useState<string | null>(null)
  const [filterGroup,   setFilterGroup]   = useState<string | null>(null)

  const selectedRelations = selectedTable
    ? RELATIONS.filter(r => r.from.startsWith(selectedTable + '.') || r.to.startsWith(selectedTable + '.'))
    : RELATIONS

  const visibleTables = filterGroup
    ? TABLES.filter(t => t.group === filterGroup)
    : TABLES

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white mb-1">Diagrama Entidad-Relación (DER)</h2>
        <p className="text-gray-400 text-sm">
          {TABLES.length} tablas · {RELATIONS.length} relaciones · PostgreSQL con RLS
        </p>
      </div>

      {/* Filtros por grupo */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => { setFilterGroup(null); setSelectedTable(null) }}
          className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${
            !filterGroup ? 'bg-white/15 text-white border-white/20' : 'bg-white/5 text-gray-400 border-white/10 hover:text-white'
          }`}
        >
          Todas ({TABLES.length})
        </button>
        {Object.entries(GROUP_CONFIG).map(([key, cfg]) => {
          const count = TABLES.filter(t => t.group === key).length
          return (
            <button key={key} onClick={() => setFilterGroup(filterGroup === key ? null : key)}
              className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${
                filterGroup === key
                  ? `bg-${cfg.color}-500/20 text-${cfg.color}-400 border-${cfg.color}-500/30`
                  : 'bg-white/5 text-gray-400 border-white/10 hover:text-white'
              }`}
            >
              {cfg.label} ({count})
            </button>
          )
        })}
        {selectedTable && (
          <button onClick={() => setSelectedTable(null)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs border bg-cyan-500/20 border-cyan-500/30 text-cyan-400 ml-auto">
            <X className="w-3 h-3" />
            Limpiar selección
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Grid de tablas */}
        <div className="xl:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {visibleTables.map(t => (
            <TableCard
              key={t.id}
              table={t}
              isSelected={selectedTable === t.id}
              onSelect={setSelectedTable}
            />
          ))}
        </div>

        {/* Panel de relaciones */}
        <div className="space-y-4">

          {/* Relaciones */}
          <div className="bg-white/3 border border-white/10 rounded-2xl p-4">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <Link className="w-4 h-4 text-blue-400" />
              {selectedTable ? `Relaciones de ${selectedTable}` : 'Todas las relaciones'}
              <span className="text-xs text-gray-500 ml-auto">{selectedRelations.length}</span>
            </h3>
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {selectedRelations.map((r, i) => {
                const [fromTable] = r.from.split('.')
                const [toTable]   = r.to.split('.')
                const fromColor   = TABLES.find(t => t.id === fromTable)?.color ?? 'gray'
                const toColor     = TABLES.find(t => t.id === toTable)?.color ?? 'gray'
                return (
                  <div key={i} className="flex items-start gap-2 text-xs bg-white/3 rounded-xl p-2.5 border border-white/5">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`font-mono text-${fromColor}-400 font-medium`}>{fromTable}</span>
                        <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${
                          r.type === '1:N' ? 'bg-blue-500/20 text-blue-400' :
                          r.type === 'N:1' ? 'bg-purple-500/20 text-purple-400' :
                          'bg-gray-500/20 text-gray-400'
                        }`}>{r.type}</span>
                        <span className={`font-mono text-${toColor}-400 font-medium`}>{toTable}</span>
                        {r.optional && <span className="text-gray-600">(opt.)</span>}
                      </div>
                      <p className="text-gray-500 mt-1 font-mono text-xs truncate">
                        {r.from} → {r.to}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Leyenda */}
          <div className="bg-white/3 border border-white/10 rounded-2xl p-4">
            <h3 className="text-sm font-semibold text-white mb-3">Leyenda</h3>
            <div className="space-y-2 text-xs">
              {[
                { icon: <Key className="w-3 h-3 text-yellow-400" />,  label: 'Primary Key (PK)' },
                { icon: <Link className="w-3 h-3 text-blue-400" />,   label: 'Foreign Key (FK)'  },
                { icon: <span className="text-yellow-300 font-mono text-xs">🔑</span>, label: 'Unique Key (UK)' },
                { icon: <span className="text-white font-mono">*</span>, label: 'Not Null (NN)' },
                { icon: <span className="font-bold text-blue-400 text-xs">1:N</span>, label: 'Uno a muchos' },
                { icon: <span className="font-bold text-gray-400 text-xs">1:1</span>, label: 'Uno a uno' },
              ].map((l, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-5 flex justify-center">{l.icon}</div>
                  <span className="text-gray-400">{l.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="bg-white/3 border border-white/10 rounded-2xl p-4">
            <h3 className="text-sm font-semibold text-white mb-3">Estadísticas</h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                { label: 'Tablas',       value: TABLES.length },
                { label: 'Relaciones',   value: RELATIONS.length },
                { label: 'Con RLS',      value: TABLES.length },
                { label: 'Con Triggers', value: 6 },
                { label: 'Columnas FK',  value: TABLES.flatMap(t => t.columns).filter(c => c.fk).length },
                { label: 'JSONB cols',   value: TABLES.flatMap(t => t.columns).filter(c => c.type === 'JSONB').length },
              ].map((s, i) => (
                <div key={i} className="bg-white/5 rounded-xl px-3 py-2 text-center">
                  <p className="text-white font-bold text-base">{s.value}</p>
                  <p className="text-gray-500">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <p className="text-center text-xs text-gray-600">
        Haz clic en una tabla para ver sus relaciones · Haz clic en ▼ para ver columnas detalladas
      </p>
    </div>
  )
}
