// =====================================================
// Pricing Page Component
// Displays plans and handles Stripe checkout flow
// =====================================================

import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || '',
  import.meta.env.VITE_SUPABASE_ANON_KEY || ''
)

interface Plan {
  id: string
  name: string
  slug: string
  description: string
  price_monthly: number
  price_yearly: number
  max_domains: number
  max_scans_per_month: number
  max_reports_per_month: number
  max_users: number
  features: {
    cloudflare_protection: boolean
    shodan_scanning: boolean
    performance_tests: boolean
    security_tests: boolean
    ai_reports: boolean
    priority_support: boolean
    api_access: boolean
    white_label: boolean
    [key: string]: any
  }
  enabled_services: string[]
}

type BillingCycle = 'monthly' | 'yearly'

export function PricingPage() {
  const { user, organization, subscription } = useAuth()
  const navigate = useNavigate()
  
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null)
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly')
  const [error, setError] = useState<string | null>(null)

  // Cargar planes al montar
  React.useEffect(() => {
    loadPlans()
  }, [])

  const loadPlans = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('plans')
        .select('*')
        .eq('active', true)
        .order('price_monthly', { ascending: true })

      if (error) throw error
      setPlans(data || [])
    } catch (err: any) {
      console.error('Error loading plans:', err)
      setError('Failed to load plans. Please refresh the page.')
    } finally {
      setLoading(false)
    }
  }

  const handleSubscribe = async (planSlug: string) => {
    // Verificar autenticación
    if (!user) {
      navigate('/login?redirect=/pricing')
      return
    }

    // Verificar que sea admin
    if (!organization) {
      setError('Organization not found. Please contact support.')
      return
    }

    // Plan free no requiere checkout
    if (planSlug === 'free') {
      setError('You are already on the free plan.')
      return
    }

    try {
      setCheckoutLoading(planSlug)
      setError(null)

      // Obtener token de sesión
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('Not authenticated')
      }

      // Llamar Edge Function para crear checkout
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            plan_slug: planSlug,
            billing_cycle: billingCycle,
            success_url: `${window.location.origin}/dashboard?checkout=success`,
            cancel_url: `${window.location.origin}/pricing?checkout=cancelled`
          })
        }
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create checkout session')
      }

      const { checkout_url } = await response.json()

      // Redirigir a Stripe Checkout
      window.location.href = checkout_url

    } catch (err: any) {
      console.error('Checkout error:', err)
      setError(err.message || 'Failed to start checkout. Please try again.')
      setCheckoutLoading(null)
    }
  }

  const getPrice = (plan: Plan) => {
    return billingCycle === 'monthly' ? plan.price_monthly : plan.price_yearly
  }

  const getSavings = (plan: Plan) => {
    if (billingCycle === 'yearly') {
      const monthlyCost = plan.price_monthly * 12
      const yearlyCost = plan.price_yearly
      const savings = monthlyCost - yearlyCost
      const savingsPercent = Math.round((savings / monthlyCost) * 100)
      return { amount: savings, percent: savingsPercent }
    }
    return null
  }

  const isCurrentPlan = (planSlug: string) => {
    return subscription?.plan?.slug === planSlug
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Choose Your Plan
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Professional cybersecurity services for every business size
          </p>

          {/* Billing Cycle Toggle */}
          <div className="inline-flex items-center bg-white rounded-lg p-1 shadow-sm">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-6 py-2 rounded-md font-medium transition-colors ${
                billingCycle === 'monthly'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:text-gray-900'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-6 py-2 rounded-md font-medium transition-colors ${
                billingCycle === 'yearly'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:text-gray-900'
              }`}
            >
              Yearly
              <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                Save 17%
              </span>
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-8 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {plans.map((plan) => {
            const price = getPrice(plan)
            const savings = getSavings(plan)
            const isCurrent = isCurrentPlan(plan.slug)
            const isLoading = checkoutLoading === plan.slug

            return (
              <div
                key={plan.id}
                className={`bg-white rounded-lg shadow-lg overflow-hidden ${
                  plan.slug === 'pro' ? 'ring-2 ring-blue-600' : ''
                }`}
              >
                {/* Plan Header */}
                <div className="p-6 bg-gradient-to-br from-gray-50 to-white">
                  {plan.slug === 'pro' && (
                    <span className="inline-block bg-blue-600 text-white text-xs font-semibold px-3 py-1 rounded-full mb-4">
                      MOST POPULAR
                    </span>
                  )}
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    {plan.name}
                  </h3>
                  <p className="text-gray-600 text-sm mb-4">
                    {plan.description}
                  </p>
                  <div className="flex items-baseline">
                    <span className="text-4xl font-bold text-gray-900">
                      ${price}
                    </span>
                    <span className="text-gray-600 ml-2">
                      /{billingCycle === 'monthly' ? 'mo' : 'yr'}
                    </span>
                  </div>
                  {savings && (
                    <p className="text-sm text-green-600 mt-2">
                      Save ${savings.amount}/year ({savings.percent}% off)
                    </p>
                  )}
                </div>

                {/* Features List */}
                <div className="p-6">
                  <ul className="space-y-3 mb-6">
                    <li className="flex items-start">
                      <svg className="h-5 w-5 text-green-500 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-gray-700">
                        {plan.max_domains} {plan.max_domains === 1 ? 'domain' : 'domains'}
                      </span>
                    </li>
                    <li className="flex items-start">
                      <svg className="h-5 w-5 text-green-500 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-gray-700">
                        {plan.max_scans_per_month} scans/month
                      </span>
                    </li>
                    <li className="flex items-start">
                      <svg className="h-5 w-5 text-green-500 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-gray-700">
                        {plan.max_reports_per_month} reports/month
                      </span>
                    </li>
                    <li className="flex items-start">
                      <svg className="h-5 w-5 text-green-500 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-gray-700">
                        {plan.max_users} {plan.max_users === 1 ? 'user' : 'users'}
                      </span>
                    </li>
                    {plan.features.cloudflare_protection && (
                      <li className="flex items-start">
                        <svg className="h-5 w-5 text-green-500 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-gray-700">Cloudflare Protection</span>
                      </li>
                    )}
                    {plan.features.ai_reports && (
                      <li className="flex items-start">
                        <svg className="h-5 w-5 text-green-500 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-gray-700">AI-Generated Reports</span>
                      </li>
                    )}
                    {plan.features.priority_support && (
                      <li className="flex items-start">
                        <svg className="h-5 w-5 text-green-500 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-gray-700">Priority Support</span>
                      </li>
                    )}
                  </ul>

                  {/* CTA Button */}
                  <button
                    onClick={() => handleSubscribe(plan.slug)}
                    disabled={isCurrent || isLoading || plan.slug === 'free'}
                    className={`w-full py-3 px-4 rounded-lg font-semibold transition-colors ${
                      isCurrent
                        ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                        : plan.slug === 'free'
                        ? 'bg-gray-200 text-gray-600 cursor-not-allowed'
                        : plan.slug === 'pro'
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-gray-900 text-white hover:bg-gray-800'
                    } ${isLoading ? 'opacity-50 cursor-wait' : ''}`}
                  >
                    {isLoading ? (
                      <span className="flex items-center justify-center">
                        <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Processing...
                      </span>
                    ) : isCurrent ? (
                      'Current Plan'
                    ) : plan.slug === 'free' ? (
                      'Free Forever'
                    ) : (
                      'Subscribe Now'
                    )}
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {/* FAQ or Additional Info */}
        <div className="mt-16 text-center">
          <p className="text-gray-600">
            Need a custom plan? <a href="/contact" className="text-blue-600 hover:underline">Contact us</a>
          </p>
          <p className="text-gray-500 text-sm mt-2">
            All plans include 14-day free trial. No credit card required.
          </p>
        </div>
      </div>
    </div>
  )
}