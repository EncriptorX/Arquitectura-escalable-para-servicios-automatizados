/**
 * OnboardingPage
 * Se muestra cuando el usuario está autenticado pero aún no tiene organización.
 * Recoge los datos necesarios para crear la organización y asignarle el rol admin.
 */

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Shield, Building2, Globe, Loader2, CheckCircle, ArrowRight } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export function OnboardingPage() {
  const { user, signOut } = useAuth()
  const [step, setStep] = useState<'form' | 'done'>('form')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    orgName:  '',
    domain:   '',
    fullName: user?.full_name ?? '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
    setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.orgName.trim()) { setError('El nombre de la organización es requerido.'); return }
    if (!user) return

    setLoading(true)
    setError('')

    try {
      // 1. Actualizar nombre completo del perfil si cambió
      if (form.fullName.trim() && form.fullName !== user.full_name) {
        await supabase
          .from('user_profiles')
          .update({ full_name: form.fullName.trim(), updated_at: new Date().toISOString() })
          .eq('id', user.id)
      }

      // 2. Crear organización
      const slug = form.orgName.trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        + '-' + user.id.slice(0, 8)

      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name:           form.orgName.trim(),
          slug,
          domain:         form.domain.trim() || null,
          plan:           'free',
          status:         'active',
          settings:       {},
          security_config: {},
        })
        .select()
        .single()

      if (orgError) throw orgError

      // 3. Asignar como admin de la org
      const { error: memberError } = await supabase
        .from('organization_members')
        .insert({
          organization_id: org.id,
          user_id:         user.id,
          role:            'admin',
          status:          'active',
          permissions:     [
            'manage_organization','manage_users','manage_billing',
            'manage_domains','view_domains','execute_scans',
            'manage_services','generate_reports','view_reports',
            'view_audit_logs','manage_notifications',
          ],
          joined_at:   new Date().toISOString(),
          created_at:  new Date().toISOString(),
          updated_at:  new Date().toISOString(),
        })

      if (memberError) throw memberError

      setStep('done')

      // Recargar la página para que AuthContext cargue la nueva membresía
      setTimeout(() => window.location.reload(), 1500)

    } catch (err: any) {
      setError(err.message ?? 'Error al crear la organización. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-black to-gray-900 flex items-center justify-center px-4">

      {/* Background glows */}
      <motion.div
        className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"
        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 8, repeat: Infinity }}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <Shield className="text-cyan-400 w-8 h-8" />
          <span className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            Cuban CAS
          </span>
        </div>

        {step === 'done' ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white/5 border border-green-500/20 rounded-2xl p-8 text-center"
          >
            <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">¡Organización creada!</h2>
            <p className="text-gray-400 text-sm">Cargando tu panel de administrador...</p>
            <div className="mt-4 flex justify-center">
              <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
            </div>
          </motion.div>
        ) : (
          <div className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-2xl p-8">
            <h2 className="text-2xl font-bold text-white mb-1">Configura tu organización</h2>
            <p className="text-gray-400 text-sm mb-6">
              Completa estos datos para activar tu panel de ciberseguridad.
            </p>

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm mb-5">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Tu nombre completo</label>
                <input
                  name="fullName"
                  type="text"
                  value={form.fullName}
                  onChange={handleChange}
                  placeholder="Nombre Apellido"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-cyan-500/50"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1.5">
                  Nombre de la organización <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    name="orgName"
                    type="text"
                    value={form.orgName}
                    onChange={handleChange}
                    placeholder="Mi Empresa S.A."
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-cyan-500/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1.5">
                  Dominio principal <span className="text-gray-500">(opcional)</span>
                </label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    name="domain"
                    type="text"
                    value={form.domain}
                    onChange={handleChange}
                    placeholder="miempresa.com"
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-cyan-500/50"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">El dominio que deseas proteger con Cuban CAS.</p>
              </div>

              <motion.button
                type="submit"
                disabled={loading}
                whileHover={{ scale: loading ? 1 : 1.02 }}
                whileTap={{ scale: loading ? 1 : 0.98 }}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-all mt-2"
              >
                {loading
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Creando...</>
                  : <><span>Activar panel</span><ArrowRight className="w-4 h-4" /></>
                }
              </motion.button>
            </form>

            <button
              onClick={signOut}
              className="w-full mt-4 text-xs text-gray-500 hover:text-gray-400 transition-colors"
            >
              Cerrar sesión
            </button>
          </div>
        )}
      </motion.div>
    </div>
  )
}
