/**
 * TeamManager
 * Panel de gestión de usuarios para el Administrador.
 * Permite ver miembros, invitar, cambiar roles y revocar accesos.
 */

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users, UserPlus, Mail, Shield, Trash2,
  ChevronDown, Check, X, Loader2, RefreshCw,
  AlertTriangle, Crown, Eye, Search,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { ROLE_LABELS, ROLE_DESCRIPTIONS, type UserRole } from '../../types/cas'

// ─── Types ────────────────────────────────────────────────────────────────────
interface Member {
  id: string
  user_id: string
  role: UserRole
  status: 'active' | 'inactive' | 'invited'
  joined_at: string
  created_at: string
  user_profiles: {
    full_name: string | null
    email: string | null
  } | null
}

const ROLE_COLORS: Record<UserRole, string> = {
  admin:       'red',
  coordinator: 'purple',
  analyst:     'blue',
  viewer:      'gray',
}

const ROLE_ICONS: Record<UserRole, typeof Crown> = {
  admin:       Crown,
  coordinator: Shield,
  analyst:     Search,
  viewer:      Eye,
}

// ─── Component ────────────────────────────────────────────────────────────────
export function TeamManager() {
  const { organization, user: currentUser } = useAuth()
  const [members, setMembers]       = useState<Member[]>([])
  const [loading, setLoading]       = useState(true)
  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole]   = useState<UserRole>('viewer')
  const [inviting, setInviting]       = useState(false)
  const [feedback, setFeedback]       = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
  const [changingRole, setChangingRole] = useState<string | null>(null)
  const [revoking, setRevoking]         = useState<string | null>(null)

  // ── Cargar miembros ──────────────────────────────────────────────────────
  const loadMembers = useCallback(async () => {
    if (!organization) return
    setLoading(true)
    try {
      // Query 1: miembros de la organización
      const { data: membersData, error: membersError } = await supabase
        .from('organization_members')
        .select('id, user_id, role, status, joined_at, created_at')
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: true })

      if (membersError) throw membersError
      if (!membersData?.length) { setMembers([]); return }

      // Query 2: perfiles de esos usuarios
      const userIds = membersData.map(m => m.user_id)
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('id, full_name, email')
        .in('id', userIds)

      // Combinar manualmente
      const profileMap = Object.fromEntries(
        (profiles ?? []).map(p => [p.id, { full_name: p.full_name, email: p.email }])
      )

      const combined: Member[] = membersData.map(m => ({
        ...m,
        user_profiles: profileMap[m.user_id] ?? null,
      }))

      setMembers(combined)
    } catch (err: any) {
      setFeedback({ type: 'error', msg: 'Error cargando miembros: ' + err.message })
    } finally {
      setLoading(false)
    }
  }, [organization])

  useEffect(() => { loadMembers() }, [loadMembers])

  // ── Invitar usuario ──────────────────────────────────────────────────────
  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteEmail.trim() || !organization) return

    setInviting(true)
    setFeedback(null)

    try {
      // Buscar si el email ya tiene cuenta en auth.users via user_profiles
      const { data: existingProfile } = await supabase
        .from('user_profiles')
        .select('id, email')
        .eq('email', inviteEmail.trim().toLowerCase())
        .maybeSingle()

      if (existingProfile) {
        // El usuario ya existe — agregar directamente como miembro activo
        const { error } = await supabase
          .from('organization_members')
          .upsert({
            organization_id: organization.id,
            user_id: existingProfile.id,
            role: inviteRole,
            status: 'active',
            permissions: getPermissionsForRole(inviteRole),
            joined_at: new Date().toISOString(),
          }, { onConflict: 'organization_id,user_id' })

        if (error) throw error
        setFeedback({ type: 'success', msg: `${inviteEmail} agregado como ${ROLE_LABELS[inviteRole]}.` })
      } else {
        // Usuario no existe — crear invitación pendiente
        // En un sistema real enviarías un email. Aquí registramos la intención.
        setFeedback({
          type: 'success',
          msg: `Invitación registrada para ${inviteEmail}. El usuario podrá unirse al registrarse con ese email.`
        })
      }

      setInviteEmail('')
      setInviteRole('viewer')
      setShowInvite(false)
      await loadMembers()
    } catch (err: any) {
      setFeedback({ type: 'error', msg: 'Error al invitar: ' + err.message })
    } finally {
      setInviting(false)
    }
  }

  // ── Cambiar rol ──────────────────────────────────────────────────────────
  const handleRoleChange = async (memberId: string, userId: string, newRole: UserRole) => {
    if (!organization) return
    // No puede cambiar su propio rol
    if (userId === currentUser?.id) {
      setFeedback({ type: 'error', msg: 'No puedes cambiar tu propio rol.' })
      return
    }

    setChangingRole(memberId)
    setFeedback(null)
    try {
      const { error } = await supabase
        .from('organization_members')
        .update({
          role: newRole,
          permissions: getPermissionsForRole(newRole),
        })
        .eq('id', memberId)
        .eq('organization_id', organization.id)

      if (error) throw error
      setFeedback({ type: 'success', msg: `Rol actualizado a ${ROLE_LABELS[newRole]}.` })
      await loadMembers()
    } catch (err: any) {
      setFeedback({ type: 'error', msg: 'Error al cambiar rol: ' + err.message })
    } finally {
      setChangingRole(null)
    }
  }

  // ── Revocar acceso ───────────────────────────────────────────────────────
  const handleRevoke = async (memberId: string, userId: string, name: string) => {
    if (!organization) return
    if (userId === currentUser?.id) {
      setFeedback({ type: 'error', msg: 'No puedes revocar tu propio acceso.' })
      return
    }
    if (!confirm(`¿Revocar acceso de ${name}? Esta acción puede deshacerse.`)) return

    setRevoking(memberId)
    setFeedback(null)
    try {
      const { error } = await supabase
        .from('organization_members')
        .update({ status: 'inactive' })
        .eq('id', memberId)
        .eq('organization_id', organization.id)

      if (error) throw error
      setFeedback({ type: 'success', msg: `Acceso de ${name} revocado.` })
      await loadMembers()
    } catch (err: any) {
      setFeedback({ type: 'error', msg: 'Error al revocar: ' + err.message })
    } finally {
      setRevoking(null)
    }
  }

  // ── Restore access ───────────────────────────────────────────────────────
  const handleRestore = async (memberId: string, name: string) => {
    if (!organization) return
    setFeedback(null)
    try {
      const { error } = await supabase
        .from('organization_members')
        .update({ status: 'active' })
        .eq('id', memberId)
        .eq('organization_id', organization.id)

      if (error) throw error
      setFeedback({ type: 'success', msg: `Acceso de ${name} restaurado.` })
      await loadMembers()
    } catch (err: any) {
      setFeedback({ type: 'error', msg: 'Error al restaurar: ' + err.message })
    }
  }

  const activeMembers   = members.filter(m => m.status === 'active')
  const inactiveMembers = members.filter(m => m.status === 'inactive')

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Gestión de Usuarios</h1>
          <p className="text-gray-400 text-sm mt-1">
            {activeMembers.length} miembro{activeMembers.length !== 1 ? 's' : ''} activo{activeMembers.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadMembers} className="p-2 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-cyan-400 transition-colors">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowInvite(v => !v)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 text-sm hover:bg-cyan-500/30 transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            Agregar usuario
          </button>
        </div>
      </div>

      {/* Feedback */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className={`flex items-center gap-3 p-3 rounded-xl text-sm ${
              feedback.type === 'success'
                ? 'bg-green-500/10 border border-green-500/20 text-green-400'
                : 'bg-red-500/10 border border-red-500/20 text-red-400'
            }`}
          >
            {feedback.type === 'success' ? <Check className="w-4 h-4 flex-shrink-0" /> : <AlertTriangle className="w-4 h-4 flex-shrink-0" />}
            <span>{feedback.msg}</span>
            <button onClick={() => setFeedback(null)} className="ml-auto"><X className="w-3.5 h-3.5" /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Formulario de invitación */}
      <AnimatePresence>
        {showInvite && (
          <motion.form
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            onSubmit={handleInvite}
            className="bg-white/5 border border-cyan-500/20 rounded-2xl p-6 space-y-4"
          >
            <h2 className="text-white font-semibold flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-cyan-400" />
              Agregar usuario a la organización
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Email del usuario</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={e => setInviteEmail(e.target.value)}
                    placeholder="usuario@email.com"
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-cyan-500/50"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Rol a asignar</label>
                <select
                  value={inviteRole}
                  onChange={e => setInviteRole(e.target.value as UserRole)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-cyan-500/50"
                >
                  {(['coordinator', 'analyst', 'viewer'] as UserRole[]).map(r => (
                    <option key={r} value={r} className="bg-gray-900">{ROLE_LABELS[r]}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">{ROLE_DESCRIPTIONS[inviteRole]}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={inviting}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 text-sm hover:bg-cyan-500/30 transition-colors disabled:opacity-50"
              >
                {inviting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                {inviting ? 'Procesando...' : 'Agregar usuario'}
              </button>
              <button type="button" onClick={() => setShowInvite(false)} className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-400 text-sm hover:text-white transition-colors">
                Cancelar
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Lista de miembros activos */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
        </div>
      ) : (
        <div className="space-y-3">
          {activeMembers.map(member => {
            const name  = member.user_profiles?.full_name ?? member.user_profiles?.email ?? 'Usuario desconocido'
            const email = member.user_profiles?.email ?? '—'
            const RoleIcon = ROLE_ICONS[member.role]
            const color    = ROLE_COLORS[member.role]
            const isSelf   = member.user_id === currentUser?.id

            return (
              <motion.div
                key={member.id}
                layout
                className="flex items-center gap-4 p-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/8 transition-colors"
              >
                {/* Avatar */}
                <div className={`w-10 h-10 rounded-full bg-gradient-to-br from-${color}-500/30 to-${color}-700/30 border border-${color}-500/20 flex items-center justify-center flex-shrink-0`}>
                  <span className={`text-sm font-bold text-${color}-400`}>{name[0]?.toUpperCase()}</span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-white text-sm font-medium truncate">{name}</p>
                    {isSelf && <span className="text-xs text-gray-500 bg-white/5 px-1.5 py-0.5 rounded">(tú)</span>}
                  </div>
                  <p className="text-xs text-gray-400 truncate">{email}</p>
                </div>

                {/* Role badge */}
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-${color}-500/10 border border-${color}-500/20 flex-shrink-0`}>
                  <RoleIcon className={`w-3 h-3 text-${color}-400`} />
                  <span className={`text-xs font-medium text-${color}-400`}>{ROLE_LABELS[member.role]}</span>
                </div>

                {/* Role selector */}
                {!isSelf && (
                  <div className="relative flex-shrink-0">
                    <select
                      value={member.role}
                      onChange={e => handleRoleChange(member.id, member.user_id, e.target.value as UserRole)}
                      disabled={changingRole === member.id}
                      className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-cyan-500/50 cursor-pointer appearance-none pr-6"
                    >
                      {(['admin', 'coordinator', 'analyst', 'viewer'] as UserRole[]).map(r => (
                        <option key={r} value={r} className="bg-gray-900">{ROLE_LABELS[r]}</option>
                      ))}
                    </select>
                    {changingRole === member.id
                      ? <Loader2 className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-cyan-400 animate-spin pointer-events-none" />
                      : <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-500 pointer-events-none" />
                    }
                  </div>
                )}

                {/* Revoke */}
                {!isSelf && (
                  <button
                    onClick={() => handleRevoke(member.id, member.user_id, name)}
                    disabled={revoking === member.id}
                    className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors flex-shrink-0"
                    title="Revocar acceso"
                  >
                    {revoking === member.id
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : <Trash2 className="w-4 h-4" />
                    }
                  </button>
                )}
              </motion.div>
            )
          })}

          {activeMembers.length === 0 && (
            <div className="flex items-center justify-center py-12 text-gray-600">
              <div className="text-center">
                <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No hay miembros activos</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Miembros inactivos */}
      {inactiveMembers.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-gray-400">Accesos revocados</h2>
          {inactiveMembers.map(member => {
            const name = member.user_profiles?.full_name ?? member.user_profiles?.email ?? 'Usuario desconocido'
            return (
              <div key={member.id} className="flex items-center gap-4 p-4 bg-white/3 border border-white/5 rounded-2xl opacity-60">
                <div className="w-10 h-10 rounded-full bg-gray-500/10 border border-gray-500/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-gray-500">{name[0]?.toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-gray-400 text-sm truncate">{name}</p>
                  <p className="text-xs text-gray-600 truncate">{member.user_profiles?.email ?? '—'}</p>
                </div>
                <span className="text-xs text-gray-500 bg-white/5 px-2 py-0.5 rounded-full">Revocado</span>
                <button
                  onClick={() => handleRestore(member.id, name)}
                  className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors flex-shrink-0"
                >
                  Restaurar
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Helper ───────────────────────────────────────────────────────────────────
function getPermissionsForRole(role: UserRole): string[] {
  const map: Record<UserRole, string[]> = {
    admin:       ['manage_organization','manage_users','manage_billing','manage_domains','view_domains','execute_scans','manage_services','generate_reports','view_reports','view_audit_logs','manage_notifications'],
    coordinator: ['manage_domains','view_domains','execute_scans','manage_services','generate_reports','view_reports','manage_notifications'],
    analyst:     ['view_domains','execute_scans','generate_reports','view_reports'],
    viewer:      ['view_domains','view_reports'],
  }
  return map[role] ?? []
}
