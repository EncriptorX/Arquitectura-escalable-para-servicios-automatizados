// =====================================================
// Authentication Context
// =====================================================

import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { AuthContextType, UserProfile, Organization, Subscription, OrganizationMember } from '../types/cas'

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: React.ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [membership, setMembership] = useState<OrganizationMember | null>(null)
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Patrón oficial Supabase: onAuthStateChange dispara INITIAL_SESSION
    // al arrancar con la sesión guardada en localStorage.
    // NO usar getSession() + onAuthStateChange juntos — causa race condition.
    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'INITIAL_SESSION') {
          // Primera carga: sesión desde localStorage (puede ser null si no hay sesión)
          if (session?.user) {
            await loadUserData(session.user.id)
          } else {
            setLoading(false)
          }
        } else if (event === 'SIGNED_IN') {
          await loadUserData(session!.user.id)
        } else if (event === 'SIGNED_OUT') {
          setUser(null)
          setOrganization(null)
          setMembership(null)
          setSubscription(null)
          setLoading(false)
        } else if (event === 'TOKEN_REFRESHED') {
          // Token renovado silenciosamente — no recargar datos del perfil
          setLoading(false)
        }
      }
    )

    return () => authSubscription.unsubscribe()
  }, [])

  const loadUserData = async (userId: string) => {
    // Timeout de seguridad: si tarda más de 10s, desbloquear la UI
    const timeout = setTimeout(() => {
      console.warn('[auth] loadUserData timeout — unblocking UI')
      setLoading(false)
    }, 10000)

    try {
      setLoading(true)

      // Perfil de usuario
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (profileError || !profile) {
        console.warn('Profile not found, using auth fallback:', profileError?.message)
        const { data: authUser } = await supabase.auth.getUser()
        if (authUser?.user) {
          setUser({
            id: authUser.user.id,
            full_name: authUser.user.email ?? 'Usuario',
            two_factor_enabled: false,
            security_notifications: true,
            created_at: '',
            updated_at: '',
          })
        }
        return
      }

      setUser(profile)

      // Membresía en organización
      const { data: membershipData, error: membershipError } = await supabase
        .from('organization_members')
        .select('*, organization:organizations(*)')
        .eq('user_id', userId)
        .eq('status', 'active')
        .single()

      if (membershipError || !membershipData) {
        console.warn('Membership not found:', membershipError?.message)
        return
      }

      setMembership(membershipData)
      setOrganization(membershipData.organization)

      // Suscripción (opcional)
      if (membershipData.organization?.id) {
        const { data: sub } = await supabase
          .from('subscriptions')
          .select('*, plan:plans(*)')
          .eq('organization_id', membershipData.organization.id)
          .eq('status', 'active')
          .maybeSingle()
        setSubscription(sub ?? null)
      }

      // last_login en background
      supabase
        .from('user_profiles')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', userId)
        .then(() => {})

    } catch (error) {
      console.error('Error loading user data:', error)
    } finally {
      clearTimeout(timeout)
      setLoading(false)
    }
  }

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) {
      throw error
    }
  }

  const signUp = async (email: string, password: string, userData: Partial<UserProfile>) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: userData.full_name,
          company_name: userData.company_name || 'My Organization'
        }
      }
    })

    if (error) {
      throw error
    }

    // Note: User profile and organization will be created automatically 
    // by the handle_new_user_registration() trigger in the database
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      throw error
    }
  }

  const updateProfile = async (data: Partial<UserProfile>) => {
    if (!user) return

    const { error } = await supabase
      .from('user_profiles')
      .update({
        ...data,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)

    if (error) {
      throw error
    }

    // Reload user data
    await loadUserData(user.id)
  }

  const value: AuthContextType = {
    user,
    organization,
    membership,
    subscription,
    loading,
    signIn,
    signUp,
    signOut,
    updateProfile
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

// Hook for protected routes
export function useRequireAuth() {
  const { user, loading } = useAuth()
  
  useEffect(() => {
    if (!loading && !user) {
      // Redirect to login
      window.location.href = '/login'
    }
  }, [user, loading])

  return { user, loading }
}

// Hook for role-based access
export function usePermissions() {
  const { membership } = useAuth()

  const hasPermission = (permission: string): boolean => {
    if (!membership) return false
    if (membership.role === 'admin') return true
    return membership.permissions.includes(permission)
  }

  const hasRole = (role: OrganizationMember['role']): boolean => {
    if (!membership) return false
    return membership.role === role
  }

  const hasAnyRole = (roles: OrganizationMember['role'][]): boolean => {
    if (!membership) return false
    return roles.includes(membership.role)
  }

  return {
    hasPermission,
    hasRole,
    hasAnyRole,
    isAdmin: membership?.role === 'admin',
    isManager: membership?.role === 'manager',
    isAnalyst: membership?.role === 'analyst',
    isViewer: membership?.role === 'viewer',
    role: membership?.role,
    permissions: membership?.permissions || []
  }
}