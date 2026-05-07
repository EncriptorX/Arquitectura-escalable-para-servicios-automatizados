import { memo, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  Lock,
  Eye,
  EyeOff,
  Mail,
  AlertCircle,
  CheckCircle,
  Loader2,
  KeyRound,
  UserPlus,
  LogIn,
  ArrowLeft,
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

// ─── Supabase client ─────────────────────────────────────────────────────────
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || '',
  import.meta.env.VITE_SUPABASE_ANON_KEY || ''
);

// ─── Zero Trust principles ───────────────────────────────────────────────────
const ZTA_PRINCIPLES = [
  {
    icon: Shield,
    title: 'Verificación Explícita',
    desc: 'Cada acceso es autenticado y autorizado con múltiples factores.',
  },
  {
    icon: Lock,
    title: 'Mínimo Privilegio',
    desc: 'Los usuarios solo acceden a los recursos estrictamente necesarios.',
  },
  {
    icon: KeyRound,
    title: 'Nunca Confiar, Siempre Verificar',
    desc: 'Ninguna sesión es implícitamente confiable, sin importar el origen.',
  },
];

// ─── Types ────────────────────────────────────────────────────────────────────
type Mode = 'login' | 'register' | 'forgot';

interface FormState {
  email: string;
  password: string;
  confirmPassword: string;
  fullName: string;
}

interface FeedbackState {
  type: 'error' | 'success' | null;
  message: string;
}

// ─── Reusable input ───────────────────────────────────────────────────────────
interface InputFieldProps {
  label: string;
  name: string;
  type: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  icon: React.ReactNode;
  placeholder?: string;
  autoComplete?: string;
  rightAction?: React.ReactNode;
}

function InputField({ label, name, type, value, onChange, icon, placeholder, autoComplete, rightAction }: InputFieldProps) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-gray-300 mb-1.5">
        {label}
      </label>
      <div className="relative flex items-center">
        <span className="absolute left-3 text-gray-500 pointer-events-none">{icon}</span>
        <input
          id={name}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-10 py-3 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-cyan-500/50 focus:bg-white/8 transition-all"
        />
        {rightAction && (
          <span className="absolute right-3">{rightAction}</span>
        )}
      </div>
    </div>
  );
}

// ─── Submit button ────────────────────────────────────────────────────────────
function SubmitButton({ loading, icon, children }: { loading: boolean; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <motion.button
      type="submit"
      disabled={loading}
      whileHover={{ scale: loading ? 1 : 1.02 }}
      whileTap={{ scale: loading ? 1 : 0.98 }}
      className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-xl transition-all mt-2"
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : icon}
      <span>{loading ? 'Procesando...' : children}</span>
    </motion.button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
type LoginPageProps = {
  onLoginSuccess: () => void;
};

function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const [mode, setMode] = useState<Mode>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>({ type: null, message: '' });
  const [form, setForm] = useState<FormState>({ email: '', password: '', confirmPassword: '', fullName: '' });

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setFeedback({ type: null, message: '' });
  }, []);

  const switchMode = (next: Mode) => {
    setMode(next);
    setFeedback({ type: null, message: '' });
    setForm({ email: '', password: '', confirmPassword: '', fullName: '' });
  };

  // ── Login ──────────────────────────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      setFeedback({ type: 'error', message: 'Completa todos los campos.' });
      return;
    }
    setLoading(true);
    setFeedback({ type: null, message: '' });
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: form.email.trim().toLowerCase(),
        password: form.password,
      });
      if (error) throw error;
      onLoginSuccess();
    } catch (err: any) {
      const msg = err?.message === 'Invalid login credentials'
        ? 'Credenciales incorrectas. Verifica tu email y contraseña.'
        : err?.message || 'Error al iniciar sesión. Intenta de nuevo.';
      setFeedback({ type: 'error', message: msg });
    } finally {
      setLoading(false);
    }
  };

  // ── Register ───────────────────────────────────────────────────────────────
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName || !form.email || !form.password || !form.confirmPassword) {
      setFeedback({ type: 'error', message: 'Completa todos los campos.' });
      return;
    }
    if (form.password.length < 8) {
      setFeedback({ type: 'error', message: 'La contraseña debe tener al menos 8 caracteres.' });
      return;
    }
    if (form.password !== form.confirmPassword) {
      setFeedback({ type: 'error', message: 'Las contraseñas no coinciden.' });
      return;
    }
    setLoading(true);
    setFeedback({ type: null, message: '' });
    try {
      const { error } = await supabase.auth.signUp({
        email: form.email.trim().toLowerCase(),
        password: form.password,
        options: { data: { full_name: form.fullName.trim(), company_name: 'Mi Organización' } },
      });
      if (error) throw error;
      setFeedback({ type: 'success', message: 'Cuenta creada. Revisa tu email para confirmar el registro.' });
      setMode('login');
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Error al crear la cuenta. Intenta de nuevo.' });
    } finally {
      setLoading(false);
    }
  };

  // ── Forgot password ────────────────────────────────────────────────────────
  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email) {
      setFeedback({ type: 'error', message: 'Ingresa tu email.' });
      return;
    }
    setLoading(true);
    setFeedback({ type: null, message: '' });
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        form.email.trim().toLowerCase(),
        { redirectTo: `${window.location.origin}/reset-password` }
      );
      if (error) throw error;
      setFeedback({ type: 'success', message: 'Revisa tu email. Te enviamos un enlace para restablecer tu contraseña.' });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Error al enviar el email. Intenta de nuevo.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-black to-gray-900 flex">

      {/* ── Left panel: ZTA info ── */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center px-16 relative overflow-hidden">
        <motion.div
          className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl"
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 8, repeat: Infinity }}
        />
        <motion.div
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"
          animate={{ scale: [1.2, 1, 1.2], opacity: [0.5, 0.3, 0.5] }}
          transition={{ duration: 8, repeat: Infinity, delay: 1 }}
        />
        <div className="relative z-10 space-y-10">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-3">
            <div className="relative">
              <Shield className="text-cyan-400 w-10 h-10" />
              <motion.div
                className="absolute inset-0 bg-cyan-400/20 rounded-full blur-xl"
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              SecurePerimeter
            </span>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
            <h1 className="text-4xl font-bold text-white leading-tight mb-4">
              Acceso Seguro con{' '}
              <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                Zero Trust
              </span>
            </h1>
            <p className="text-gray-400 text-lg">
              Arquitectura de seguridad que no asume confianza implícita en ningún usuario, dispositivo o red.
            </p>
          </motion.div>

          <div className="space-y-5">
            {ZTA_PRINCIPLES.map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.1 }}
                className="flex items-start gap-4 p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm"
              >
                <div className="bg-gradient-to-br from-cyan-500/20 to-blue-600/20 w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <item.icon className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <p className="font-semibold text-white text-sm">{item.title}</p>
                  <p className="text-gray-400 text-sm mt-0.5">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right panel: form ── */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-6 py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">

          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-3 mb-8 justify-center">
            <Shield className="text-cyan-400 w-8 h-8" />
            <span className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              SecurePerimeter
            </span>
          </div>

          {/* Card */}
          <div className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-2xl p-8 shadow-2xl">

            {/* Header */}
            <AnimatePresence mode="wait">
              <motion.div
                key={mode + '-header'}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="mb-6"
              >
                {mode === 'forgot' && (
                  <button
                    onClick={() => switchMode('login')}
                    className="flex items-center gap-1 text-sm text-gray-400 hover:text-cyan-400 transition-colors mb-4"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Volver al login
                  </button>
                )}
                <h2 className="text-2xl font-bold text-white">
                  {mode === 'login' && 'Iniciar Sesión'}
                  {mode === 'register' && 'Crear Cuenta'}
                  {mode === 'forgot' && 'Recuperar Contraseña'}
                </h2>
                <p className="text-gray-400 text-sm mt-1">
                  {mode === 'login' && 'Accede a tu panel de ciberseguridad'}
                  {mode === 'register' && 'Comienza a proteger tus dominios hoy'}
                  {mode === 'forgot' && 'Te enviaremos un enlace a tu email'}
                </p>
              </motion.div>
            </AnimatePresence>

            {/* Feedback */}
            <AnimatePresence>
              {feedback.type && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className={`flex items-start gap-3 p-3 rounded-lg mb-5 text-sm ${
                    feedback.type === 'error'
                      ? 'bg-red-500/10 border border-red-500/30 text-red-400'
                      : 'bg-green-500/10 border border-green-500/30 text-green-400'
                  }`}
                >
                  {feedback.type === 'error'
                    ? <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    : <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  }
                  <span>{feedback.message}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Forms */}
            <AnimatePresence mode="wait">
              {mode === 'login' && (
                <motion.form key="login" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} onSubmit={handleLogin} className="space-y-4">
                  <InputField label="Email" name="email" type="email" value={form.email} onChange={handleChange} icon={<Mail className="w-4 h-4" />} placeholder="tu@email.com" autoComplete="email" />
                  <InputField
                    label="Contraseña" name="password" type={showPassword ? 'text' : 'password'} value={form.password} onChange={handleChange}
                    icon={<Lock className="w-4 h-4" />} placeholder="••••••••" autoComplete="current-password"
                    rightAction={
                      <button type="button" onClick={() => setShowPassword(v => !v)} className="text-gray-400 hover:text-cyan-400 transition-colors" aria-label="Mostrar/ocultar contraseña">
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    }
                  />
                  <div className="flex justify-end">
                    <button type="button" onClick={() => switchMode('forgot')} className="text-xs text-gray-400 hover:text-cyan-400 transition-colors">
                      ¿Olvidaste tu contraseña?
                    </button>
                  </div>
                  <SubmitButton loading={loading} icon={<LogIn className="w-4 h-4" />}>Iniciar Sesión</SubmitButton>
                </motion.form>
              )}

              {mode === 'register' && (
                <motion.form key="register" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} onSubmit={handleRegister} className="space-y-4">
                  <InputField label="Nombre completo" name="fullName" type="text" value={form.fullName} onChange={handleChange} icon={<UserPlus className="w-4 h-4" />} placeholder="Tu nombre" autoComplete="name" />
                  <InputField label="Email" name="email" type="email" value={form.email} onChange={handleChange} icon={<Mail className="w-4 h-4" />} placeholder="tu@email.com" autoComplete="email" />
                  <InputField
                    label="Contraseña" name="password" type={showPassword ? 'text' : 'password'} value={form.password} onChange={handleChange}
                    icon={<Lock className="w-4 h-4" />} placeholder="Mínimo 8 caracteres" autoComplete="new-password"
                    rightAction={
                      <button type="button" onClick={() => setShowPassword(v => !v)} className="text-gray-400 hover:text-cyan-400 transition-colors" aria-label="Mostrar/ocultar contraseña">
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    }
                  />
                  <InputField
                    label="Confirmar contraseña" name="confirmPassword" type={showConfirm ? 'text' : 'password'} value={form.confirmPassword} onChange={handleChange}
                    icon={<Lock className="w-4 h-4" />} placeholder="Repite tu contraseña" autoComplete="new-password"
                    rightAction={
                      <button type="button" onClick={() => setShowConfirm(v => !v)} className="text-gray-400 hover:text-cyan-400 transition-colors" aria-label="Mostrar/ocultar contraseña">
                        {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    }
                  />
                  <SubmitButton loading={loading} icon={<UserPlus className="w-4 h-4" />}>Crear Cuenta</SubmitButton>
                </motion.form>
              )}

              {mode === 'forgot' && (
                <motion.form key="forgot" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} onSubmit={handleForgot} className="space-y-4">
                  <InputField label="Email" name="email" type="email" value={form.email} onChange={handleChange} icon={<Mail className="w-4 h-4" />} placeholder="tu@email.com" autoComplete="email" />
                  <SubmitButton loading={loading} icon={<Mail className="w-4 h-4" />}>Enviar Enlace</SubmitButton>
                </motion.form>
              )}
            </AnimatePresence>

            {/* Mode switcher */}
            {mode !== 'forgot' && (
              <p className="text-center text-sm text-gray-400 mt-6">
                {mode === 'login' ? (
                  <>¿No tienes cuenta?{' '}<button onClick={() => switchMode('register')} className="text-cyan-400 hover:text-cyan-300 font-medium transition-colors">Regístrate</button></>
                ) : (
                  <>¿Ya tienes cuenta?{' '}<button onClick={() => switchMode('login')} className="text-cyan-400 hover:text-cyan-300 font-medium transition-colors">Inicia sesión</button></>
                )}
              </p>
            )}
          </div>

          {/* ZTA badge */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="flex items-center justify-center gap-2 mt-6 text-xs text-gray-500"
          >
            <Shield className="w-3.5 h-3.5 text-cyan-500/60" />
            <span>Protegido por Zero Trust Architecture (ZTA)</span>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}

export default memo(LoginPage);
