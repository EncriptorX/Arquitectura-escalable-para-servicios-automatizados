import { useRef, useState, FormEvent, useEffect } from 'react';
import { X, Plus, Loader2, Shield, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

declare global {
  interface Window {
    turnstile: {
      render: (element: HTMLElement, options: Record<string, unknown>) => string | number;
      reset: (widgetId: string | number) => void;
    };
  }
}

const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY;

interface ServiceRequestFormProps {
  onClose: () => void;
  onSuccess: (payload: {
    message: string;
    urls: string[];
    output?: string;
  }) => void;
}

export default function ServiceRequestForm({ onClose, onSuccess }: ServiceRequestFormProps) {
  const [formData, setFormData] = useState({
    company_name: '',
    contact_name: '',
    email: '',
    phone: '',
    comments: '',
  });
  const [urls, setUrls] = useState(['']);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [serviceEnabled, setServiceEnabled] = useState(true);
  const [checkingService, setCheckingService] = useState(true);

  // Estado para el token de Turnstile
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [isTurnstileReady, setIsTurnstileReady] = useState(false);
  const turnstileContainerRef = useRef<HTMLDivElement | null>(null);
  const turnstileWidgetIdRef = useRef<string | number | null>(null);

  // Verificar estado del servicio al montar
  useEffect(() => {
    checkServiceStatus();
  }, []);

  const checkServiceStatus = async () => {
    try {
      const response = await fetch('/api/toggle-service');
      const data = await response.json();
      
      if (data.status === 'ok') {
        setServiceEnabled(data.service_enabled);
      }
    } catch (error) {
      console.error('Error verificando estado del servicio:', error);
    } finally {
      setCheckingService(false);
    }
  };

  useEffect(() => {
    const scriptId = 'cloudflare-turnstile-script';
    const existingScript = document.getElementById(scriptId);
    
    if (!existingScript) {
      const script = document.createElement('script');
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
      script.id = scriptId;
      script.async = true;
      script.defer = true;
      script.onload = () => setIsTurnstileReady(true);
      document.body.appendChild(script);
      return;
    }
    
    if (window.turnstile) {
      setIsTurnstileReady(true);
      return;
    }
    
    const interval = setInterval(() => {
      if (window.turnstile) {
        setIsTurnstileReady(true);
        clearInterval(interval);
      }
    }, 50);
    
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!turnstileContainerRef.current || !isTurnstileReady || !window.turnstile || turnstileWidgetIdRef.current != null) {
      return;
    }

    if (!TURNSTILE_SITE_KEY) {
      setError('Falta configurar VITE_TURNSTILE_SITE_KEY en el frontend.');
      return;
    }

    try {
      const widgetId = window.turnstile.render(turnstileContainerRef.current, {
        sitekey: TURNSTILE_SITE_KEY,
        theme: 'dark',
        callback: (token: string) => setTurnstileToken(token),
        'expired-callback': () => setTurnstileToken(null),
        'error-callback': () => setTurnstileToken(null),
      });
      turnstileWidgetIdRef.current = widgetId;
    } catch (e) {
      console.error('Error renderizando Turnstile:', e);
      setError('No se pudo cargar la verificación de seguridad. Recargue la página.');
    }
  }, [isTurnstileReady]);

  const addUrlField = () => {
    setUrls([...urls, '']);
  };

  const removeUrlField = (index: number) => {
    if (urls.length > 1) {
      const newUrls = urls.filter((_, i) => i !== index);
      setUrls(newUrls);
    }
  };

  const updateUrl = (index: number, value: string) => {
    const newUrls = [...urls];
    newUrls[index] = value;
    setUrls(newUrls);
  };

  const validateForm = () => {
    const { company_name, contact_name, email } = formData;
    
    if (!company_name.trim()) {
      setError('El nombre de la empresa es requerido');
      return false;
    }
    if (!contact_name.trim()) {
      setError('El nombre del responsable es requerido');
      return false;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Un correo electrónico válido es requerido');
      return false;
    }
    
    const validUrls = urls.filter(url => url.trim());
    if (validUrls.length === 0) {
      setError('Debe proporcionar al menos un dominio');
      return false;
    }
    
    // Validar formato FQDN de cada URL
    for (const url of validUrls) {
      const domain = url.trim();
      
      // Rechazar esquemas
      if (domain.includes('://')) {
        setError(`No se permiten esquemas (http://, https://). Use solo el dominio: ${domain}`);
        return false;
      }
      
      // Rechazar rutas
      if (domain.includes('/')) {
        setError(`No se permiten rutas. Use solo el dominio: ${domain}`);
        return false;
      }
      
      // Rechazar IPs
      const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/;
      if (ipPattern.test(domain)) {
        setError(`No se permiten direcciones IP. Use un dominio FQDN: ${domain}`);
        return false;
      }
      
      // Validar formato FQDN básico
      const fqdnPattern = /^(?=.{1,253}$)(?!-)([A-Za-z0-9-]{1,63}(?<!-)\.)+[A-Za-z]{2,63}$/;
      if (!fqdnPattern.test(domain)) {
        setError(`Formato de dominio inválido: ${domain}. Use formato FQDN (ej: ejemplo.com)`);
        return false;
      }
    }
    
    return true;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) {
      return;
    }

    // Validación de seguridad (Turnstile) antes de enviar
    if (!turnstileToken) {
      alert("Por favor, complete la verificación de seguridad.");
      return;
    }

    setIsSubmitting(true);

    const validUrls = urls.filter(url => url.trim());

    try {
      const response = await fetch('/api/solicitar-proteccion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company: formData.company_name,
          email: formData.email,
          urls: validUrls,
          turnstileToken
        })
      });

      const contentType = response.headers.get('content-type') || '';
      const result = contentType.includes('application/json')
        ? await response.json()
        : { message: await response.text() };

      if (!response.ok) {
        setError(result.message || 'Error al enviar la solicitud');
        
        if (response.status === 403 && window.turnstile && turnstileWidgetIdRef.current != null) {
          setTurnstileToken(null);
          try {
            window.turnstile.reset(turnstileWidgetIdRef.current);
          } catch {
            // Ignorar errores de reset
          }
        }
        return;
      }
      
      if (window.turnstile && turnstileWidgetIdRef.current != null) {
        try {
          window.turnstile.reset(turnstileWidgetIdRef.current);
        } catch {
          // Ignorar errores de reset
        }
      }
      
      setTurnstileToken(null);
      setFormData({
        company_name: '',
        contact_name: '',
        email: '',
        phone: '',
        comments: '',
      });
      setUrls(['']);
      
      onSuccess({
        message: result.message || 'Protección perimetral en proceso',
        urls: validUrls,
        output: JSON.stringify(result),
      });
    } catch (err) {
      setError(err instanceof Error 
        ? `Error de conexión: ${err.message}` 
        : 'Error al conectar con el servidor. Verifica que el backend Flask esté corriendo.');
      console.error('Error submitting request:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[60] p-4 overflow-y-auto"
      onClick={onClose}
    >
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: "spring", duration: 0.5 }}
        className="glass border-white/20 rounded-2xl w-full max-w-2xl my-8 max-h-[90vh] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Shield className="w-6 h-6 text-cyan-400" />
              <motion.div
                className="absolute inset-0 bg-cyan-400/20 rounded-full blur-xl"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold gradient-text">Solicitud de Protección</h2>
          </div>
          <motion.button
            onClick={onClose}
            className="glass glass-hover p-2 rounded-full"
            whileHover={{ scale: 1.1, rotate: 90 }}
            whileTap={{ scale: 0.9 }}
            aria-label="Cerrar"
          >
            <X className="w-5 h-5 text-gray-400" />
          </motion.button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1 custom-scrollbar">
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="glass border-l-4 border-red-400 p-4 rounded-r-xl"
              >
                <p className="text-red-400 text-sm">{error}</p>
              </motion.div>
            )}
            
            {/* Service Disabled Warning */}
            {!checkingService && !serviceEnabled && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="glass border-l-4 border-yellow-400 bg-yellow-900/20 p-4 rounded-r-xl"
              >
                <div className="flex items-start gap-3">
                  <span className="text-yellow-400 text-xl">⚠️</span>
                  <div>
                    <p className="text-yellow-300 text-sm font-semibold mb-1">
                      Servicio Temporalmente Deshabilitado
                    </p>
                    <p className="text-yellow-300/80 text-xs">
                      El servicio de protección está deshabilitado. No se procesarán solicitudes hasta que se reactive.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <label htmlFor="company_name" className="block text-sm font-medium text-gray-300 mb-2">
              Nombre de la Empresa *
            </label>
            <input
              type="text"
              id="company_name"
              required
              value={formData.company_name}
              onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
              className="w-full px-4 py-3 glass border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/20 transition-all"
              placeholder="Acme Corporation"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 }}
          >
            <label htmlFor="contact_name" className="block text-sm font-medium text-gray-300 mb-2">
              Nombre del Responsable *
            </label>
            <input
              type="text"
              id="contact_name"
              required
              value={formData.contact_name}
              onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
              className="w-full px-4 py-3 glass border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/20 transition-all"
              placeholder="John Doe"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
              Correo Electrónico *
            </label>
            <input
              type="email"
              id="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-3 glass border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/20 transition-all"
              placeholder="john@acme.com"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.25 }}
          >
            <label htmlFor="phone" className="block text-sm font-medium text-gray-300 mb-2">
              Teléfono (Opcional)
            </label>
            <input
              type="tel"
              id="phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-4 py-3 glass border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/20 transition-all"
              placeholder="+1 (555) 000-0000"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Dominios a Proteger (FQDN) *
            </label>
            <p className="text-xs text-gray-400 mb-3">
              Ingrese solo el dominio sin esquemas ni rutas (ej: ejemplo.com, app.ejemplo.com)
            </p>
            <div className="space-y-3">
              <AnimatePresence>
                {urls.map((url, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="flex gap-2"
                  >
                    <input
                      type="text"
                      value={url}
                      onChange={(e) => updateUrl(index, e.target.value)}
                      placeholder="ejemplo.com"
                      className="flex-1 px-4 py-3 glass border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/20 transition-all"
                    />
                    {urls.length > 1 && (
                      <motion.button
                        type="button"
                        onClick={() => removeUrlField(index)}
                        className="glass glass-hover px-4 py-3 rounded-xl text-red-400 hover:text-red-300"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        aria-label="Eliminar URL"
                      >
                        <X className="w-5 h-5" />
                      </motion.button>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
            <motion.button
              type="button"
              onClick={addUrlField}
              className="mt-3 flex items-center gap-2 text-cyan-400 hover:text-cyan-300 transition-colors"
              whileHover={{ x: 5 }}
            >
              <Plus className="w-5 h-5" />
              <span className="text-sm font-medium">Agregar otra URL</span>
            </motion.button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.35 }}
          >
            <label htmlFor="comments" className="block text-sm font-medium text-gray-300 mb-2">
              Comentarios Adicionales
            </label>
            <textarea
              id="comments"
              rows={3}
              value={formData.comments}
              onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
              className="w-full px-4 py-3 glass border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/20 transition-all resize-none custom-scrollbar"
              placeholder="Información adicional sobre su solicitud..."
            />
          </motion.div>

          {/* Widget de Turnstile */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            className="flex justify-center py-4"
          >
            <div
              className="cf-turnstile"
              data-sitekey={TURNSTILE_SITE_KEY}
              data-theme="dark"
              ref={turnstileContainerRef}
            ></div>
          </motion.div>

          <motion.button
            type="submit"
            disabled={isSubmitting || !serviceEnabled}
            className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-bold py-4 px-6 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 hover-glow"
            whileHover={{ scale: (isSubmitting || !serviceEnabled) ? 1 : 1.02 }}
            whileTap={{ scale: (isSubmitting || !serviceEnabled) ? 1 : 0.98 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="animate-spin w-5 h-5" />
                <span>Procesando...</span>
              </>
            ) : !serviceEnabled ? (
              <>
                <X className="w-5 h-5" />
                <span>Servicio Deshabilitado</span>
              </>
            ) : (
              <>
                <Shield className="w-5 h-5" />
                <span>Solicitar Protección</span>
                <Sparkles className="w-4 h-4" />
              </>
            )}
          </motion.button>
        </form>
      </motion.div>
    </motion.div>
  );
}