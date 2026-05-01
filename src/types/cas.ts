// =====================================================
// Cuban CAS Platform - Type Definitions
// Hardcore Security Architecture Types
// =====================================================

// =====================================================
// Core Multi-Tenant Types
// =====================================================

export interface Organization {
  id: string
  name: string
  slug: string
  domain?: string
  plan: 'free' | 'basic' | 'pro' | 'enterprise'
  status: 'active' | 'suspended' | 'trial' | 'canceled'
  
  // Billing
  stripe_customer_id?: string
  billing_email?: string
  
  // Configuration
  settings: Record<string, any>
  security_config: Record<string, any>
  
  // Timestamps
  created_at: string
  updated_at: string
}

export interface UserProfile {
  id: string
  full_name?: string
  avatar_url?: string
  phone?: string
  
  // Security
  two_factor_enabled: boolean
  security_notifications: boolean
  
  // Timestamps
  last_login_at?: string
  created_at: string
  updated_at: string
}

export interface OrganizationMember {
  id: string
  organization_id: string
  user_id: string
  role: 'admin' | 'manager' | 'analyst' | 'viewer'
  permissions: string[]
  status: 'active' | 'inactive' | 'invited'
  
  // Invitation tracking
  invited_by?: string
  invited_at?: string
  joined_at?: string
  
  // Timestamps
  created_at: string
  updated_at: string
  
  // Relations
  organization?: Organization
  user?: UserProfile
}

// =====================================================
// Plan & Subscription Types
// =====================================================

export interface Plan {
  id: string
  name: string
  slug: string
  description?: string
  
  // Pricing
  price_monthly: number
  price_yearly: number
  
  // Limits
  max_domains: number
  max_scans_per_month: number
  max_reports_per_month: number
  max_users: number
  
  // Features
  enabled_services: string[]
  features: Record<string, any>
  
  // Stripe
  stripe_price_id_monthly?: string
  stripe_price_id_yearly?: string
  
  active: boolean
  created_at: string
  updated_at: string
}

export interface Subscription {
  id: string
  organization_id: string
  plan_id: string
  status: 'active' | 'canceled' | 'past_due' | 'unpaid' | 'trialing'
  billing_cycle: 'monthly' | 'yearly'
  
  // Stripe
  stripe_subscription_id?: string
  stripe_customer_id?: string
  
  // Periods
  current_period_start?: string
  current_period_end?: string
  trial_end?: string
  canceled_at?: string
  
  // Timestamps
  created_at: string
  updated_at: string
  
  // Relations
  plan?: Plan
  organization?: Organization
}

// =====================================================
// Domain & Asset Types
// =====================================================

export interface Domain {
  id: string
  organization_id: string
  domain: string
  subdomain?: string
  status: 'active' | 'inactive' | 'pending' | 'error'
  verification_status: 'pending' | 'verified' | 'failed'
  
  // Configuration
  security_config: Record<string, any>
  
  // Cloudflare
  cloudflare_zone_id?: string
  cloudflare_dns_record_id?: string
  
  // Timestamps
  created_at: string
  updated_at: string
  
  // Relations
  organization?: Organization
}

// =====================================================
// Security Service Types
// =====================================================

export interface SecurityService {
  id: string
  name: string
  slug: string
  description?: string
  service_type: 'perimeter' | 'vulnerability' | 'performance' | 'security' | 'compliance'
  
  // Configuration
  default_config: Record<string, any>
  required_permissions: string[]
  
  // Pricing
  cost_per_execution: number
  execution_time_limit: number
  
  active: boolean
  created_at: string
  updated_at: string
}

export interface ServiceExecution {
  id: string
  organization_id: string
  domain_id: string
  service_id: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'canceled'
  
  // Configuration & Results
  config: Record<string, any>
  results?: Record<string, any>
  error_message?: string
  
  // Timing
  started_at?: string
  completed_at?: string
  execution_time_seconds?: number
  
  // Triggering
  triggered_by: 'manual' | 'schedule' | 'api' | 'retry'
  triggered_by_user_id?: string
  parent_execution_id?: string
  
  // Timestamps
  created_at: string
  updated_at: string
  
  // Relations
  domain?: Domain
  service?: SecurityService
  triggered_by_user?: UserProfile
  organization?: Organization
}

// =====================================================
// Report Types
// =====================================================

export interface ReportFinding {
  title: string
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info'
  description: string
  evidence?: string
  impact?: string
}

export interface ReportRecommendation {
  title: string
  priority: 'high' | 'medium' | 'low'
  description: string
  implementation?: string
  timeline?: string
}

export interface Report {
  id: string
  organization_id: string
  domain_id?: string
  title: string
  report_type: 'security' | 'vulnerability' | 'performance' | 'compliance' | 'comprehensive'
  format: 'pdf' | 'html' | 'json'
  
  // Content
  summary?: string
  findings: ReportFinding[]
  recommendations: ReportRecommendation[]
  
  // Generation
  status: 'generating' | 'completed' | 'failed'
  generated_by_ai: boolean
  file_url?: string
  file_size?: number
  
  // Timing
  generated_at?: string
  regenerated_at?: string
  error_message?: string
  
  // Timestamps
  created_at: string
  updated_at: string
  
  // Relations
  domain?: Domain
  organization?: Organization
}

// =====================================================
// Usage & Billing Types
// =====================================================

export interface UsageRecord {
  id: string
  organization_id: string
  subscription_id?: string
  resource_type: 'scan' | 'report' | 'domain' | 'user' | 'api_call'
  quantity: number
  metadata: Record<string, any>
  recorded_at: string
}

export interface Invoice {
  id: string
  organization_id: string
  subscription_id?: string
  stripe_invoice_id?: string
  invoice_number?: string
  
  // Amounts (in cents)
  amount_due: number
  amount_paid: number
  currency: string
  
  status: 'draft' | 'open' | 'paid' | 'void' | 'uncollectible'
  
  // Periods
  period_start?: string
  period_end?: string
  paid_at?: string
  
  // Timestamps
  created_at: string
  updated_at: string
}

// =====================================================
// Notification Types
// =====================================================

export interface Notification {
  id: string
  organization_id: string
  user_id?: string // null = org-wide
  
  subject: string
  body: string
  type: 'info' | 'warning' | 'error' | 'success'
  category?: 'security' | 'billing' | 'system' | 'report'
  
  delivery_method: 'in_app' | 'email' | 'both'
  status: 'pending' | 'sent' | 'read' | 'failed'
  
  metadata: Record<string, any>
  
  // Timing
  read_at?: string
  sent_at?: string
  created_at: string
}

// =====================================================
// Audit Types
// =====================================================

export interface AuditLog {
  id: string
  organization_id?: string
  user_id?: string
  
  action: string
  resource_type: string
  resource_id?: string
  
  ip_address?: string
  user_agent?: string
  metadata: Record<string, any>
  
  created_at: string
}

// =====================================================
// Dashboard & Analytics Types
// =====================================================

export interface DashboardStats {
  domains: {
    total: number
    active: number
    inactive: number
  }
  executions: {
    total_this_month: number
    completed: number
    failed: number
    running: number
  }
  usage: {
    scans_used: number
    scans_limit: number
    domains_used: number
    domains_limit: number
  }
  security_score: {
    average: number
    trend: 'improving' | 'stable' | 'declining'
  }
}

// =====================================================
// Context Types
// =====================================================

export interface AuthContextType {
  user: UserProfile | null
  organization: Organization | null
  membership: OrganizationMember | null
  subscription: Subscription | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, userData: Partial<UserProfile & { company_name?: string }>) => Promise<void>
  signOut: () => Promise<void>
  updateProfile: (data: Partial<UserProfile>) => Promise<void>
}

export interface AppContextType {
  domains: Domain[]
  services: SecurityService[]
  executions: ServiceExecution[]
  reports: Report[]
  notifications: Notification[]
  stats: DashboardStats | null
  loading: boolean
  refreshData: () => Promise<void>
}

// =====================================================
// API Response Types
// =====================================================

export interface ApiResponse<T = any> {
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T = any> {
  data: T[]
  count: number
  page: number
  limit: number
  total_pages: number
}

// =====================================================
// Form Types
// =====================================================

export interface OrganizationCreateForm {
  name: string
  slug: string
  domain?: string
}

export interface DomainCreateForm {
  domain: string
  subdomain?: string
}

export interface ServiceExecutionForm {
  service_id: string
  domain_id: string
  config?: Record<string, any>
}

export interface ReportGenerationForm {
  domain_id: string
  report_type: Report['report_type']
  format?: Report['format']
  include_recommendations?: boolean
}

export interface UserInviteForm {
  email: string
  role: OrganizationMember['role']
  permissions?: string[]
}

// =====================================================
// Utility Types
// =====================================================

export type UserRole = OrganizationMember['role']
export type PlanSlug = Plan['slug']
export type ServiceType = SecurityService['service_type']
export type ExecutionStatus = ServiceExecution['status']
export type ReportType = Report['report_type']
export type NotificationType = Notification['type']

// =====================================================
// Permission Constants
// =====================================================

export const PERMISSIONS = {
  // Organization management
  MANAGE_ORGANIZATION: 'manage_organization',
  MANAGE_USERS: 'manage_users',
  MANAGE_BILLING: 'manage_billing',
  
  // Domain management
  MANAGE_DOMAINS: 'manage_domains',
  VIEW_DOMAINS: 'view_domains',
  
  // Service execution
  EXECUTE_SCANS: 'execute_scans',
  MANAGE_SERVICES: 'manage_services',
  
  // Reports
  GENERATE_REPORTS: 'generate_reports',
  VIEW_REPORTS: 'view_reports',
  
  // System
  VIEW_AUDIT_LOGS: 'view_audit_logs',
  MANAGE_NOTIFICATIONS: 'manage_notifications'
} as const

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS]

// =====================================================
// Role Permissions Mapping
// =====================================================

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: Object.values(PERMISSIONS),
  manager: [
    PERMISSIONS.MANAGE_ORGANIZATION,
    PERMISSIONS.MANAGE_USERS,
    PERMISSIONS.MANAGE_DOMAINS,
    PERMISSIONS.VIEW_DOMAINS,
    PERMISSIONS.EXECUTE_SCANS,
    PERMISSIONS.MANAGE_SERVICES,
    PERMISSIONS.GENERATE_REPORTS,
    PERMISSIONS.VIEW_REPORTS,
    PERMISSIONS.MANAGE_NOTIFICATIONS
  ],
  analyst: [
    PERMISSIONS.VIEW_DOMAINS,
    PERMISSIONS.EXECUTE_SCANS,
    PERMISSIONS.GENERATE_REPORTS,
    PERMISSIONS.VIEW_REPORTS
  ],
  viewer: [
    PERMISSIONS.VIEW_DOMAINS,
    PERMISSIONS.VIEW_REPORTS
  ]
}