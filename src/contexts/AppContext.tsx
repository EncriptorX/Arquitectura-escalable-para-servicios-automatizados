// =====================================================
// Application Context
// =====================================================

import React, { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useAuth } from './AuthContext'
import {
  AppContextType,
  Domain,
  SecurityService,
  ServiceExecution,
  Report,
  Notification,
  DashboardStats
} from '../types/cas'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || '',
  import.meta.env.VITE_SUPABASE_ANON_KEY || ''
)

const AppContext = createContext<AppContextType | undefined>(undefined)

export function useApp() {
  const context = useContext(AppContext)
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider')
  }
  return context
}

interface AppProviderProps {
  children: React.ReactNode
}

export function AppProvider({ children }: AppProviderProps) {
  const { user, organization, subscription } = useAuth()
  const [domains, setDomains] = useState<Domain[]>([])
  const [services, setServices] = useState<SecurityService[]>([])
  const [executions, setExecutions] = useState<ServiceExecution[]>([])
  const [reports, setReports] = useState<Report[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (user && organization) {
      refreshData()
      setupRealtimeSubscriptions()
    }
  }, [user, organization])

  const refreshData = async () => {
    if (!organization) return

    setLoading(true)
    try {
      await Promise.all([
        loadDomains(),
        loadServices(),
        loadExecutions(),
        loadReports(),
        loadNotifications(),
        loadStats()
      ])
    } catch (error) {
      console.error('Error refreshing data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadDomains = async () => {
    if (!organization) return

    const { data, error } = await supabase
      .from('domains')
      .select('*')
      .eq('organization_id', organization.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error loading domains:', error)
      return
    }

    setDomains(data || [])
  }

  const loadServices = async () => {
    if (!subscription?.plan) return

    const enabledServices = subscription.plan.enabled_services || []

    const { data, error } = await supabase
      .from('security_services')
      .select('*')
      .eq('active', true)
      .in('slug', enabledServices)

    if (error) {
      console.error('Error loading services:', error)
      return
    }

    setServices(data || [])
  }

  const loadExecutions = async () => {
    if (!organization) return

    const { data, error } = await supabase
      .from('service_executions')
      .select(`
        *,
        domain:domains(domain, subdomain),
        service:security_services(name, slug),
        triggered_by_user:user_profiles(full_name, email)
      `)
      .eq('organization_id', organization.id)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('Error loading executions:', error)
      return
    }

    setExecutions(data || [])
  }

  const loadReports = async () => {
    if (!organization) return

    const { data, error } = await supabase
      .from('reports')
      .select(`
        *,
        domain:domains(domain, subdomain)
      `)
      .eq('organization_id', organization.id)
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) {
      console.error('Error loading reports:', error)
      return
    }

    setReports(data || [])
  }

  const loadNotifications = async () => {
    if (!organization || !user) return

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('organization_id', organization.id)
      .or(`user_id.is.null,user_id.eq.${user.id}`)
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) {
      console.error('Error loading notifications:', error)
      return
    }

    setNotifications(data || [])
  }

  const loadStats = async () => {
    if (!organization) return

    try {
      // Calculate stats from existing data
      const currentMonth = new Date()
      currentMonth.setDate(1)
      currentMonth.setHours(0, 0, 0, 0)

      const nextMonth = new Date(currentMonth)
      nextMonth.setMonth(nextMonth.getMonth() + 1)

      // Get current month executions
      const { data: monthlyExecutions } = await supabase
        .from('service_executions')
        .select('status')
        .eq('organization_id', organization.id)
        .gte('created_at', currentMonth.toISOString())
        .lt('created_at', nextMonth.toISOString())

      // Get usage data
      const { data: usage } = await supabase
        .from('usage_records')
        .select('resource_type, quantity')
        .eq('organization_id', organization.id)
        .gte('recorded_at', currentMonth.toISOString())
        .lt('recorded_at', nextMonth.toISOString())

      // Calculate aggregated usage
      const aggregatedUsage = usage?.reduce((acc: any, record: any) => {
        acc[record.resource_type] = (acc[record.resource_type] || 0) + record.quantity
        return acc
      }, {}) || {}

      // Calculate execution stats
      const executionStats = monthlyExecutions?.reduce((acc: any, exec: any) => {
        acc[exec.status] = (acc[exec.status] || 0) + 1
        return acc
      }, {}) || {}

      const dashboardStats: DashboardStats = {
        domains: {
          total: domains.length,
          active: domains.filter(d => d.status === 'active').length,
          inactive: domains.filter(d => d.status === 'inactive').length
        },
        executions: {
          total_this_month: monthlyExecutions?.length || 0,
          completed: executionStats.completed || 0,
          failed: executionStats.failed || 0,
          running: executionStats.running || 0
        },
        usage: {
          scans_used: aggregatedUsage.scan || 0,
          scans_limit: subscription?.plan?.max_scans_per_month || 0,
          domains_used: domains.length,
          domains_limit: subscription?.plan?.max_domains || 0
        },
        security_score: {
          average: 85, // This would be calculated from actual security assessments
          trend: 'stable'
        }
      }

      setStats(dashboardStats)
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }

  const setupRealtimeSubscriptions = () => {
    if (!organization) return

    // Subscribe to executions changes
    const executionsSubscription = supabase
      .channel('executions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'service_executions',
          filter: `organization_id=eq.${organization.id}`
        },
        () => {
          loadExecutions()
          loadStats()
        }
      )
      .subscribe()

    // Subscribe to notifications
    const notificationsSubscription = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `organization_id=eq.${organization.id}`
        },
        () => {
          loadNotifications()
        }
      )
      .subscribe()

    // Subscribe to reports
    const reportsSubscription = supabase
      .channel('reports')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reports',
          filter: `organization_id=eq.${organization.id}`
        },
        () => {
          loadReports()
        }
      )
      .subscribe()

    return () => {
      executionsSubscription.unsubscribe()
      notificationsSubscription.unsubscribe()
      reportsSubscription.unsubscribe()
    }
  }

  const value: AppContextType = {
    domains,
    services,
    executions,
    reports,
    notifications,
    stats,
    loading,
    refreshData
  }

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  )
}

// Custom hooks for specific data
export function useDomains() {
  const { domains } = useApp()
  return domains
}

export function useServices() {
  const { services } = useApp()
  return services
}

export function useExecutions() {
  const { executions } = useApp()
  return executions
}

export function useReports() {
  const { reports } = useApp()
  return reports
}

export function useNotifications() {
  const { notifications } = useApp()
  return notifications
}

export function useStats() {
  const { stats } = useApp()
  return stats
}