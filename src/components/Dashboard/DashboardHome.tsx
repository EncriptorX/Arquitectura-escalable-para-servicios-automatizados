// =====================================================
// Dashboard Home Component
// =====================================================

import React from 'react'
import { useStats, useExecutions, useDomains } from '../../contexts/AppContext'
import { useAuth } from '../../contexts/AuthContext'
import {
  Shield,
  Globe,
  Activity,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  ArrowUpRight,
  ArrowDownRight,
  Minus
} from 'lucide-react'

export function DashboardHome() {
  const { user, organization, subscription } = useAuth()
  const stats = useStats()
  const executions = useExecutions()
  const domains = useDomains()

  const recentExecutions = executions.slice(0, 5)
  const activeDomains = domains.filter(d => d.monitoring_enabled)

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'running':
        return <Clock className="h-5 w-5 text-blue-500" />
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />
      default:
        return <Clock className="h-5 w-5 text-gray-500" />
    }
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <ArrowUpRight className="h-4 w-4 text-green-500" />
      case 'down':
        return <ArrowDownRight className="h-4 w-4 text-red-500" />
      default:
        return <Minus className="h-4 w-4 text-gray-500" />
    }
  }

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {user?.full_name || user?.email?.split('@')[0]}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Here's what's happening with your security monitoring
        </p>
      </div>

      {/* Stats Grid */}
      {stats && (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {/* Domains */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Globe className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total Domains
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stats.domains.total}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-5 py-3">
              <div className="text-sm">
                <span className="text-green-600 font-medium">
                  {stats.domains.active} active
                </span>
                <span className="text-gray-500 mx-2">•</span>
                <span className="text-gray-600">
                  {stats.domains.inactive} inactive
                </span>
              </div>
            </div>
          </div>

          {/* Security Score */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Shield className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Security Score
                    </dt>
                    <dd className="flex items-center">
                      <span className="text-lg font-medium text-gray-900">
                        {stats.security_score.average}%
                      </span>
                      <span className="ml-2">
                        {getTrendIcon(stats.security_score.trend)}
                      </span>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-5 py-3">
              <div className="text-sm text-gray-600">
                Based on latest scans
              </div>
            </div>
          </div>

          {/* Monthly Scans */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Activity className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Scans This Month
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stats.usage.scans_used} / {stats.usage.scans_limit}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-5 py-3">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-indigo-600 h-2 rounded-full"
                  style={{
                    width: `${Math.min((stats.usage.scans_used / stats.usage.scans_limit) * 100, 100)}%`
                  }}
                />
              </div>
            </div>
          </div>

          {/* Executions */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <TrendingUp className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Executions
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stats.executions.total_this_month}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-5 py-3">
              <div className="text-sm">
                <span className="text-green-600 font-medium">
                  {stats.executions.completed} completed
                </span>
                {stats.executions.failed > 0 && (
                  <>
                    <span className="text-gray-500 mx-2">•</span>
                    <span className="text-red-600 font-medium">
                      {stats.executions.failed} failed
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Activity */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Recent Activity
            </h3>
            <div className="space-y-4">
              {recentExecutions.length > 0 ? (
                recentExecutions.map((execution) => (
                  <div key={execution.id} className="flex items-center space-x-3">
                    {getStatusIcon(execution.status)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {execution.service?.name} on {execution.domain?.domain}
                        {execution.domain?.subdomain && `.${execution.domain.subdomain}`}
                      </p>
                      <p className="text-sm text-gray-500">
                        {new Date(execution.created_at).toLocaleDateString()} at{' '}
                        {new Date(execution.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        execution.status === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : execution.status === 'running'
                          ? 'bg-blue-100 text-blue-800'
                          : execution.status === 'failed'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {execution.status}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6">
                  <Activity className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No recent activity</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Start by adding a domain to monitor
                  </p>
                  <div className="mt-6">
                    <a
                      href="/dashboard/domains"
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                    >
                      Add Domain
                    </a>
                  </div>
                </div>
              )}
            </div>
            {recentExecutions.length > 0 && (
              <div className="mt-6">
                <a
                  href="/dashboard/services"
                  className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
                >
                  View all activity →
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Active Domains */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Active Domains
            </h3>
            <div className="space-y-4">
              {activeDomains.length > 0 ? (
                activeDomains.slice(0, 5).map((domain) => (
                  <div key={domain.id} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <div className={`h-2 w-2 rounded-full ${
                          domain.status === 'active' ? 'bg-green-400' : 'bg-gray-400'
                        }`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {domain.domain}
                          {domain.subdomain && (
                            <span className="text-gray-500">.{domain.subdomain}</span>
                          )}
                        </p>
                        <p className="text-sm text-gray-500">
                          Last scan: {domain.last_scan_at 
                            ? new Date(domain.last_scan_at).toLocaleDateString()
                            : 'Never'
                          }
                        </p>
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        domain.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {domain.status}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6">
                  <Globe className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No domains yet</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Add your first domain to start monitoring
                  </p>
                  <div className="mt-6">
                    <a
                      href="/dashboard/domains"
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                    >
                      Add Domain
                    </a>
                  </div>
                </div>
              )}
            </div>
            {activeDomains.length > 5 && (
              <div className="mt-6">
                <a
                  href="/dashboard/domains"
                  className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
                >
                  View all domains →
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            Quick Actions
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <a
              href="/dashboard/domains"
              className="relative group bg-white p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-500 rounded-lg border border-gray-200 hover:border-gray-300"
            >
              <div>
                <span className="rounded-lg inline-flex p-3 bg-indigo-50 text-indigo-700 ring-4 ring-white">
                  <Globe className="h-6 w-6" />
                </span>
              </div>
              <div className="mt-4">
                <h3 className="text-lg font-medium">
                  <span className="absolute inset-0" />
                  Add Domain
                </h3>
                <p className="mt-2 text-sm text-gray-500">
                  Start monitoring a new domain for security issues
                </p>
              </div>
            </a>

            <a
              href="/dashboard/services"
              className="relative group bg-white p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-500 rounded-lg border border-gray-200 hover:border-gray-300"
            >
              <div>
                <span className="rounded-lg inline-flex p-3 bg-green-50 text-green-700 ring-4 ring-white">
                  <Shield className="h-6 w-6" />
                </span>
              </div>
              <div className="mt-4">
                <h3 className="text-lg font-medium">
                  <span className="absolute inset-0" />
                  Run Security Scan
                </h3>
                <p className="mt-2 text-sm text-gray-500">
                  Execute security tests on your domains
                </p>
              </div>
            </a>

            <a
              href="/dashboard/reports"
              className="relative group bg-white p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-500 rounded-lg border border-gray-200 hover:border-gray-300"
            >
              <div>
                <span className="rounded-lg inline-flex p-3 bg-yellow-50 text-yellow-700 ring-4 ring-white">
                  <TrendingUp className="h-6 w-6" />
                </span>
              </div>
              <div className="mt-4">
                <h3 className="text-lg font-medium">
                  <span className="absolute inset-0" />
                  View Reports
                </h3>
                <p className="mt-2 text-sm text-gray-500">
                  Access detailed security and performance reports
                </p>
              </div>
            </a>

            <a
              href="/dashboard/billing"
              className="relative group bg-white p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-500 rounded-lg border border-gray-200 hover:border-gray-300"
            >
              <div>
                <span className="rounded-lg inline-flex p-3 bg-purple-50 text-purple-700 ring-4 ring-white">
                  <TrendingUp className="h-6 w-6" />
                </span>
              </div>
              <div className="mt-4">
                <h3 className="text-lg font-medium">
                  <span className="absolute inset-0" />
                  Upgrade Plan
                </h3>
                <p className="mt-2 text-sm text-gray-500">
                  Get more features and higher limits
                </p>
              </div>
            </a>
          </div>
        </div>
      </div>

      {/* Trial Banner */}
      {organization?.subscription_status === 'trial' && (
        <div className="bg-indigo-600 rounded-lg shadow">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <AlertTriangle className="h-8 w-8 text-indigo-200" />
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-white">
                    You're on a free trial
                  </h3>
                  <p className="text-indigo-200">
                    {organization.trial_ends_at && (
                      <>
                        Trial ends on {new Date(organization.trial_ends_at).toLocaleDateString()}
                      </>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex-shrink-0">
                <a
                  href="/dashboard/billing"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-600 bg-white hover:bg-indigo-50"
                >
                  Upgrade Now
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}