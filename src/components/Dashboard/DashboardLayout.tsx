// =====================================================
// Dashboard Layout Component
// =====================================================

import React, { useState } from 'react'
import { useAuth, usePermissions } from '../../contexts/AuthContext'
import { useNotifications } from '../../contexts/AppContext'
import {
  LayoutDashboard,
  Shield,
  Globe,
  FileText,
  Settings,
  Users,
  CreditCard,
  Bell,
  Menu,
  X,
  LogOut,
  User,
  ChevronDown
} from 'lucide-react'

interface DashboardLayoutProps {
  children: React.ReactNode
  currentPage?: string
}

export function DashboardLayout({ children, currentPage }: DashboardLayoutProps) {
  const { user, organization, signOut } = useAuth()
  const { hasPermission, isAdmin } = usePermissions()
  const notifications = useNotifications()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  const unreadNotifications = notifications.filter(n => n.status !== 'read').length

  const navigation = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
      current: currentPage === 'dashboard'
    },
    {
      name: 'Domains',
      href: '/dashboard/domains',
      icon: Globe,
      current: currentPage === 'domains'
    },
    {
      name: 'Security Services',
      href: '/dashboard/services',
      icon: Shield,
      current: currentPage === 'services'
    },
    {
      name: 'Reports',
      href: '/dashboard/reports',
      icon: FileText,
      current: currentPage === 'reports'
    },
    {
      name: 'Team',
      href: '/dashboard/team',
      icon: Users,
      current: currentPage === 'team',
      show: hasPermission('manage_team')
    },
    {
      name: 'Billing',
      href: '/dashboard/billing',
      icon: CreditCard,
      current: currentPage === 'billing',
      show: hasPermission('manage_billing')
    },
    {
      name: 'Settings',
      href: '/dashboard/settings',
      icon: Settings,
      current: currentPage === 'settings',
      show: isAdmin
    }
  ].filter(item => item.show !== false)

  const handleSignOut = async () => {
    try {
      await signOut()
      window.location.href = '/login'
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-40 lg:hidden ${sidebarOpen ? '' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        <div className="relative flex w-full max-w-xs flex-1 flex-col bg-white">
          <div className="absolute top-0 right-0 -mr-12 pt-2">
            <button
              type="button"
              className="ml-1 flex h-10 w-10 items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-6 w-6 text-white" />
            </button>
          </div>
          <SidebarContent navigation={navigation} />
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex min-h-0 flex-1 flex-col bg-white border-r border-gray-200">
          <SidebarContent navigation={navigation} />
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top navigation */}
        <div className="sticky top-0 z-10 bg-white shadow-sm border-b border-gray-200">
          <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
            <button
              type="button"
              className="lg:hidden -ml-0.5 -mt-0.5 h-12 w-12 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-6 w-6" />
            </button>

            <div className="flex items-center space-x-4">
              {/* Notifications */}
              <button
                type="button"
                className="relative rounded-full bg-white p-1 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                <Bell className="h-6 w-6" />
                {unreadNotifications > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-xs text-white flex items-center justify-center">
                    {unreadNotifications > 9 ? '9+' : unreadNotifications}
                  </span>
                )}
              </button>

              {/* User menu */}
              <div className="relative">
                <button
                  type="button"
                  className="flex items-center space-x-3 rounded-full bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                >
                  <div className="h-8 w-8 rounded-full bg-indigo-500 flex items-center justify-center">
                    <User className="h-5 w-5 text-white" />
                  </div>
                  <div className="hidden md:block text-left">
                    <p className="text-sm font-medium text-gray-900">{user?.full_name || user?.email}</p>
                    <p className="text-xs text-gray-500">{organization?.name}</p>
                  </div>
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                    <a
                      href="/dashboard/profile"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Your Profile
                    </a>
                    <a
                      href="/dashboard/settings"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Settings
                    </a>
                    <button
                      onClick={handleSignOut}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <LogOut className="inline h-4 w-4 mr-2" />
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="py-8">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

function SidebarContent({ navigation }: { navigation: any[] }) {
  const { organization } = useAuth()

  return (
    <>
      {/* Logo */}
      <div className="flex flex-shrink-0 items-center px-6 py-4">
        <div className="flex items-center">
          <Shield className="h-8 w-8 text-indigo-600" />
          <div className="ml-3">
            <h1 className="text-xl font-bold text-gray-900">CAS Platform</h1>
            <p className="text-sm text-gray-500">{organization?.name}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-2 py-4">
        {navigation.map((item) => {
          const Icon = item.icon
          return (
            <a
              key={item.name}
              href={item.href}
              className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                item.current
                  ? 'bg-indigo-100 text-indigo-900'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <Icon
                className={`mr-3 h-5 w-5 flex-shrink-0 ${
                  item.current ? 'text-indigo-500' : 'text-gray-400 group-hover:text-gray-500'
                }`}
              />
              {item.name}
            </a>
          )
        })}
      </nav>

      {/* Plan info */}
      <div className="flex-shrink-0 p-4">
        <div className="rounded-lg bg-indigo-50 p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CreditCard className="h-5 w-5 text-indigo-400" />
            </div>
            <div className="ml-3 flex-1">
              <p className="text-sm font-medium text-indigo-800">
                Current Plan
              </p>
              <p className="text-xs text-indigo-600">
                {organization?.subscription_status === 'trial' ? 'Free Trial' : 'Pro Plan'}
              </p>
            </div>
          </div>
          <div className="mt-3">
            <a
              href="/dashboard/billing"
              className="text-xs font-medium text-indigo-700 hover:text-indigo-600"
            >
              Manage billing →
            </a>
          </div>
        </div>
      </div>
    </>
  )
}