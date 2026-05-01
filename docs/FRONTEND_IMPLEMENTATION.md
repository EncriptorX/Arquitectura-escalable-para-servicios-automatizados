# 🎨 Implementación del Frontend - Guía Completa

## 1. Configurar Entorno de Desarrollo

### 1.1 Instalar Dependencias
```bash
cd Cuban-CAS

# Instalar dependencias principales
npm install

# Instalar dependencias adicionales para funcionalidades completas
npm install @stripe/stripe-js @stripe/react-stripe-js
npm install react-router-dom
npm install @headlessui/react
npm install @heroicons/react
npm install recharts
npm install react-hook-form
npm install @hookform/resolvers
npm install yup
npm install date-fns
npm install react-hot-toast
```

### 1.2 Configurar Variables de Entorno
```bash
# .env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
VITE_TURNSTILE_SITE_KEY=your_turnstile_site_key
```

## 2. Estructura de Componentes Completa

### 2.1 Crear Estructura de Directorios
```
src/
├── components/
│   ├── Auth/
│   │   ├── LoginForm.tsx
│   │   ├── SignupForm.tsx
│   │   └── AuthLayout.tsx
│   ├── Dashboard/
│   │   ├── DashboardLayout.tsx      ✅ (ya creado)
│   │   ├── DashboardHome.tsx        ✅ (ya creado)
│   │   └── Sidebar.tsx
│   ├── Domains/
│   │   ├── DomainsList.tsx
│   │   ├── DomainForm.tsx
│   │   ├── DomainDetails.tsx
│   │   └── DomainCard.tsx
│   ├── Services/
│   │   ├── ServicesList.tsx
│   │   ├── ServiceCard.tsx
│   │   ├── ExecutionHistory.tsx
│   │   ├── ExecutionDetails.tsx
│   │   └── ServiceConfigModal.tsx
│   ├── Reports/
│   │   ├── ReportsList.tsx
│   │   ├── ReportCard.tsx
│   │   ├── ReportViewer.tsx
│   │   ├── ReportGenerator.tsx
│   │   └── ReportDownload.tsx
│   ├── Billing/
│   │   ├── PlanSelector.tsx
│   │   ├── PaymentForm.tsx
│   │   ├── InvoiceHistory.tsx
│   │   ├── UsageStats.tsx
│   │   └── BillingLayout.tsx
│   ├── Team/
│   │   ├── TeamMembers.tsx
│   │   ├── InviteForm.tsx
│   │   ├── MemberCard.tsx
│   │   └── RoleSelector.tsx
│   ├── Notifications/
│   │   ├── NotificationsList.tsx
│   │   ├── NotificationItem.tsx
│   │   └── NotificationCenter.tsx
│   └── Common/
│       ├── LoadingSpinner.tsx
│       ├── ErrorBoundary.tsx
│       ├── Modal.tsx
│       ├── ConfirmDialog.tsx
│       └── EmptyState.tsx
├── hooks/
│   ├── useAuth.ts                   ✅ (en AuthContext)
│   ├── useApi.ts
│   ├── useSubscription.ts
│   ├── useDomains.ts
│   ├── useServices.ts
│   ├── useReports.ts
│   └── useNotifications.ts
├── utils/
│   ├── api.ts
│   ├── auth.ts
│   ├── billing.ts
│   ├── validation.ts
│   └── formatting.ts
└── pages/
    ├── LoginPage.tsx
    ├── SignupPage.tsx
    ├── DashboardPage.tsx
    ├── DomainsPage.tsx
    ├── ServicesPage.tsx
    ├── ReportsPage.tsx
    ├── BillingPage.tsx
    ├── TeamPage.tsx
    └── SettingsPage.tsx
```

## 3. Implementar Componentes Principales

### 3.1 API Client
```typescript
// src/utils/api.ts
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

export class ApiClient {
  private getAuthHeaders() {
    const token = supabase.auth.getSession().then(({ data }) => data.session?.access_token)
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  }

  async get(endpoint: string) {
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1${endpoint}`, {
      method: 'GET',
      headers: await this.getAuthHeaders()
    })
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`)
    }
    
    return response.json()
  }

  async post(endpoint: string, data: any) {
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1${endpoint}`, {
      method: 'POST',
      headers: await this.getAuthHeaders(),
      body: JSON.stringify(data)
    })
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`)
    }
    
    return response.json()
  }

  async put(endpoint: string, data: any) {
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1${endpoint}`, {
      method: 'PUT',
      headers: await this.getAuthHeaders(),
      body: JSON.stringify(data)
    })
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`)
    }
    
    return response.json()
  }

  async delete(endpoint: string) {
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1${endpoint}`, {
      method: 'DELETE',
      headers: await this.getAuthHeaders()
    })
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`)
    }
    
    return response.json()
  }
}

export const apiClient = new ApiClient()
```

### 3.2 Custom Hooks
```typescript
// src/hooks/useApi.ts
import { useState, useEffect } from 'react'
import { apiClient } from '../utils/api'

export function useApi<T>(endpoint: string, dependencies: any[] = []) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)
        const result = await apiClient.get(endpoint)
        setData(result.data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, dependencies)

  const refetch = async () => {
    try {
      setLoading(true)
      setError(null)
      const result = await apiClient.get(endpoint)
      setData(result.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return { data, loading, error, refetch }
}

// src/hooks/useDomains.ts
import { useApi } from './useApi'
import { apiClient } from '../utils/api'
import { Domain, DomainForm } from '../types/cas'

export function useDomains() {
  const { data: domains, loading, error, refetch } = useApi<Domain[]>('/organization-management/domains')

  const addDomain = async (domainData: DomainForm) => {
    const result = await apiClient.post('/organization-management/domains', domainData)
    await refetch()
    return result
  }

  const updateDomain = async (domainId: string, domainData: Partial<DomainForm>) => {
    const result = await apiClient.put(`/organization-management/domains/${domainId}`, domainData)
    await refetch()
    return result
  }

  const deleteDomain = async (domainId: string) => {
    const result = await apiClient.delete(`/organization-management/domains/${domainId}`)
    await refetch()
    return result
  }

  return {
    domains: domains || [],
    loading,
    error,
    addDomain,
    updateDomain,
    deleteDomain,
    refetch
  }
}
```

### 3.3 Componente de Dominios
```typescript
// src/components/Domains/DomainsList.tsx
import React, { useState } from 'react'
import { useDomains } from '../../hooks/useDomains'
import { DomainCard } from './DomainCard'
import { DomainForm } from './DomainForm'
import { LoadingSpinner } from '../Common/LoadingSpinner'
import { EmptyState } from '../Common/EmptyState'
import { Modal } from '../Common/Modal'
import { Plus, Globe } from 'lucide-react'

export function DomainsList() {
  const { domains, loading, error, addDomain, refetch } = useDomains()
  const [showAddModal, setShowAddModal] = useState(false)

  if (loading) return <LoadingSpinner />
  if (error) return <div className="text-red-600">Error: {error}</div>

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Domains</h1>
          <p className="text-gray-500">Manage your monitored domains</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Domain
        </button>
      </div>

      {/* Domains Grid */}
      {domains.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {domains.map((domain) => (
            <DomainCard key={domain.id} domain={domain} onUpdate={refetch} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Globe}
          title="No domains yet"
          description="Add your first domain to start monitoring"
          action={{
            label: "Add Domain",
            onClick: () => setShowAddModal(true)
          }}
        />
      )}

      {/* Add Domain Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add New Domain"
      >
        <DomainForm
          onSubmit={async (data) => {
            await addDomain(data)
            setShowAddModal(false)
          }}
          onCancel={() => setShowAddModal(false)}
        />
      </Modal>
    </div>
  )
}

// src/components/Domains/DomainCard.tsx
import React from 'react'
import { Domain } from '../../types/cas'
import { Globe, Shield, Clock, MoreVertical } from 'lucide-react'

interface DomainCardProps {
  domain: Domain
  onUpdate: () => void
}

export function DomainCard({ domain, onUpdate }: DomainCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'inactive': return 'bg-gray-100 text-gray-800'
      case 'error': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <Globe className="h-8 w-8 text-indigo-600" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-900">
              {domain.domain}
              {domain.subdomain && (
                <span className="text-gray-500">.{domain.subdomain}</span>
              )}
            </h3>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(domain.status)}`}>
              {domain.status}
            </span>
          </div>
        </div>
        <button className="text-gray-400 hover:text-gray-600">
          <MoreVertical className="h-5 w-5" />
        </button>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">Monitoring</span>
          <span className={domain.monitoring_enabled ? 'text-green-600' : 'text-gray-400'}>
            {domain.monitoring_enabled ? 'Enabled' : 'Disabled'}
          </span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">Last Scan</span>
          <span className="text-gray-900">
            {domain.last_scan_at 
              ? new Date(domain.last_scan_at).toLocaleDateString()
              : 'Never'
            }
          </span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">Scan Frequency</span>
          <span className="text-gray-900">{domain.scan_frequency_hours}h</span>
        </div>
      </div>

      <div className="mt-6 flex space-x-3">
        <button className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
          <Shield className="h-4 w-4 mr-2" />
          Scan Now
        </button>
        <button className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700">
          <Clock className="h-4 w-4 mr-2" />
          View History
        </button>
      </div>
    </div>
  )
}
```

### 3.4 Componente de Servicios
```typescript
// src/components/Services/ServicesList.tsx
import React, { useState } from 'react'
import { useServices } from '../../hooks/useServices'
import { useExecutions } from '../../hooks/useExecutions'
import { ServiceCard } from './ServiceCard'
import { ExecutionHistory } from './ExecutionHistory'
import { LoadingSpinner } from '../Common/LoadingSpinner'
import { Shield, Activity } from 'lucide-react'

export function ServicesList() {
  const { services, loading: servicesLoading } = useServices()
  const { executions, loading: executionsLoading, executeService } = useExecutions()
  const [selectedService, setSelectedService] = useState<string | null>(null)

  if (servicesLoading || executionsLoading) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Security Services</h1>
        <p className="text-gray-500">Execute and monitor security scans</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Available Services */}
        <div className="space-y-6">
          <h2 className="text-lg font-medium text-gray-900 flex items-center">
            <Shield className="h-5 w-5 mr-2" />
            Available Services
          </h2>
          <div className="space-y-4">
            {services.map((service) => (
              <ServiceCard
                key={service.id}
                service={service}
                onExecute={executeService}
              />
            ))}
          </div>
        </div>

        {/* Execution History */}
        <div className="space-y-6">
          <h2 className="text-lg font-medium text-gray-900 flex items-center">
            <Activity className="h-5 w-5 mr-2" />
            Recent Executions
          </h2>
          <ExecutionHistory executions={executions.slice(0, 10)} />
        </div>
      </div>
    </div>
  )
}
```

### 3.5 Componente de Billing
```typescript
// src/components/Billing/PlanSelector.tsx
import React from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { Plan } from '../../types/cas'
import { useAuth } from '../../contexts/AuthContext'
import { apiClient } from '../../utils/api'
import { Check, Star } from 'lucide-react'

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)

interface PlanSelectorProps {
  plans: Plan[]
  currentPlan?: Plan
}

export function PlanSelector({ plans, currentPlan }: PlanSelectorProps) {
  const { subscription } = useAuth()

  const handleSubscribe = async (planId: string, billingCycle: 'monthly' | 'yearly') => {
    try {
      const response = await apiClient.post('/subscription-management/create-checkout', {
        planId,
        billingCycle
      })

      if (response.data?.checkout_url) {
        window.location.href = response.data.checkout_url
      }
    } catch (error) {
      console.error('Subscription error:', error)
    }
  }

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900">Choose Your Plan</h2>
        <p className="mt-4 text-lg text-gray-600">
          Select the perfect plan for your security needs
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`relative rounded-lg border-2 p-8 ${
              plan.slug === 'pro' 
                ? 'border-indigo-500 shadow-lg' 
                : 'border-gray-200'
            }`}
          >
            {plan.slug === 'pro' && (
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="inline-flex items-center px-4 py-1 rounded-full text-sm font-medium bg-indigo-500 text-white">
                  <Star className="h-4 w-4 mr-1" />
                  Most Popular
                </span>
              </div>
            )}

            <div className="text-center">
              <h3 className="text-2xl font-bold text-gray-900">{plan.name}</h3>
              <p className="mt-2 text-gray-600">{plan.description}</p>
              
              <div className="mt-6">
                <span className="text-4xl font-bold text-gray-900">
                  ${plan.price_monthly}
                </span>
                <span className="text-gray-600">/month</span>
              </div>

              {plan.price_yearly > 0 && (
                <div className="mt-2">
                  <span className="text-sm text-gray-500">
                    or ${plan.price_yearly}/year (save ${(plan.price_monthly * 12) - plan.price_yearly})
                  </span>
                </div>
              )}
            </div>

            <ul className="mt-8 space-y-4">
              <li className="flex items-center">
                <Check className="h-5 w-5 text-green-500 mr-3" />
                <span className="text-gray-700">{plan.max_domains} domains</span>
              </li>
              <li className="flex items-center">
                <Check className="h-5 w-5 text-green-500 mr-3" />
                <span className="text-gray-700">{plan.max_scans_per_month} scans/month</span>
              </li>
              {plan.features.map((feature, index) => (
                <li key={index} className="flex items-center">
                  <Check className="h-5 w-5 text-green-500 mr-3" />
                  <span className="text-gray-700">{feature}</span>
                </li>
              ))}
            </ul>

            <div className="mt-8 space-y-3">
              <button
                onClick={() => handleSubscribe(plan.id, 'monthly')}
                disabled={currentPlan?.id === plan.id}
                className={`w-full py-3 px-4 rounded-md font-medium ${
                  currentPlan?.id === plan.id
                    ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                    : plan.slug === 'pro'
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                    : 'bg-white text-indigo-600 border border-indigo-600 hover:bg-indigo-50'
                }`}
              >
                {currentPlan?.id === plan.id ? 'Current Plan' : 'Subscribe Monthly'}
              </button>
              
              {plan.price_yearly > 0 && (
                <button
                  onClick={() => handleSubscribe(plan.id, 'yearly')}
                  className="w-full py-2 px-4 text-sm text-indigo-600 hover:text-indigo-700"
                >
                  Subscribe Yearly (Save ${(plan.price_monthly * 12) - plan.price_yearly})
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

## 4. Configurar Routing

### 4.1 Instalar React Router
```bash
npm install react-router-dom
```

### 4.2 Configurar App.tsx
```typescript
// src/App.tsx
import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { AppProvider } from './contexts/AppContext'
import { LoginPage } from './pages/LoginPage'
import { SignupPage } from './pages/SignupPage'
import { DashboardPage } from './pages/DashboardPage'
import { DomainsPage } from './pages/DomainsPage'
import { ServicesPage } from './pages/ServicesPage'
import { ReportsPage } from './pages/ReportsPage'
import { BillingPage } from './pages/BillingPage'
import { TeamPage } from './pages/TeamPage'
import { SettingsPage } from './pages/SettingsPage'
import { ProtectedRoute } from './components/Auth/ProtectedRoute'
import { ErrorBoundary } from './components/Common/ErrorBoundary'
import { Toaster } from 'react-hot-toast'

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppProvider>
          <Router>
            <div className="App">
              <Routes>
                {/* Public Routes */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/signup" element={<SignupPage />} />
                
                {/* Protected Routes */}
                <Route path="/dashboard" element={
                  <ProtectedRoute>
                    <DashboardPage />
                  </ProtectedRoute>
                } />
                
                <Route path="/dashboard/domains" element={
                  <ProtectedRoute>
                    <DomainsPage />
                  </ProtectedRoute>
                } />
                
                <Route path="/dashboard/services" element={
                  <ProtectedRoute>
                    <ServicesPage />
                  </ProtectedRoute>
                } />
                
                <Route path="/dashboard/reports" element={
                  <ProtectedRoute>
                    <ReportsPage />
                  </ProtectedRoute>
                } />
                
                <Route path="/dashboard/billing" element={
                  <ProtectedRoute>
                    <BillingPage />
                  </ProtectedRoute>
                } />
                
                <Route path="/dashboard/team" element={
                  <ProtectedRoute>
                    <TeamPage />
                  </ProtectedRoute>
                } />
                
                <Route path="/dashboard/settings" element={
                  <ProtectedRoute>
                    <SettingsPage />
                  </ProtectedRoute>
                } />
                
                {/* Redirect root to dashboard */}
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
              </Routes>
              
              <Toaster position="top-right" />
            </div>
          </Router>
        </AppProvider>
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App
```

## 5. Testing y Optimización

### 5.1 Configurar Testing
```bash
# Instalar dependencias de testing
npm install --save-dev @testing-library/react @testing-library/jest-dom @testing-library/user-event
npm install --save-dev vitest jsdom
```

### 5.2 Configurar Vite para Testing
```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
})
```

### 5.3 Optimización de Performance
```typescript
// src/utils/performance.ts
import { lazy } from 'react'

// Lazy loading de componentes pesados
export const LazyReportViewer = lazy(() => import('../components/Reports/ReportViewer'))
export const LazyBillingPage = lazy(() => import('../pages/BillingPage'))

// Memoización de componentes
import { memo } from 'react'

export const MemoizedDomainCard = memo(DomainCard)
export const MemoizedServiceCard = memo(ServiceCard)
```

## 6. Build y Deploy

### 6.1 Configurar Build
```bash
# Build para producción
npm run build

# Preview del build
npm run preview
```

### 6.2 Configurar Variables de Entorno para Producción
```bash
# .env.production
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_production_anon_key
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_your_live_publishable_key
VITE_TURNSTILE_SITE_KEY=your_production_turnstile_site_key
```

## ✅ Checklist de Frontend

- [ ] Dependencias instaladas
- [ ] Variables de entorno configuradas
- [ ] Estructura de componentes creada
- [ ] API client implementado
- [ ] Custom hooks creados
- [ ] Componentes principales implementados
- [ ] Routing configurado
- [ ] Autenticación integrada
- [ ] Testing configurado
- [ ] Performance optimizada
- [ ] Build de producción funcionando

## 📚 Recursos Adicionales

- [React Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [React Router](https://reactrouter.com/)
- [Supabase React Guide](https://supabase.com/docs/guides/getting-started/tutorials/with-react)