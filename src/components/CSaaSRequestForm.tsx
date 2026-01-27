import { useState, FormEvent } from 'react';
import { X, Plus, Loader2, Shield, Sparkles, Globe, CheckCircle, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface CSaaSRequestFormProps {
  onClose: () => void;
  onSuccess: (payload: {
    message: string;
    subdomain: string;
    protected_url: string;
    origin_urls: string[];
    logs?: string[];
  }) => void;
}

export default function CSaaSRequestForm({ onClose, onSuccess }: CSaaSRequestFormProps) {
  const [formData, setFormData] = useState({
    client_name: '',
    client_id: '',
    email: '',
    phone: '',
  });
  const [urls, setUrls] = useState(['']);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');

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
    const { client_name } = formData;
    
    if (!client_name.trim()) {
      setError('El nombre del cliente es requerido');
      return false;
    }
    
    const validUrls = urls.filter(url => url.trim());
    if (validUrls.length === 0) {
      setError('Debe proporcionar al menos una URL a proteger');
      return false;
    }
    
    // Validar formato FQDN de cada URL
    for (const url of validUrls) {
      const domain = url.trim();
      
      if (domain.includes('://')) {
        setError(`No se permiten esquemas (http://, https://). Use solo el dominio: ${domain}`);
        return false;
      }
      
      if (domain.includes('/')) {
        setError(`No se permiten rutas. Use solo el dominio: ${domain}`);
        return false;
      }
      
      const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/;
      if (ipPattern.test(domain)) {
        setError(`No se permiten direcciones IP. Use un dominio FQDN: ${domain}`);
        return false;
      }
      
      const fqdnPattern = /^(?=.{1,253}$)(?!-)([A-Za-z0-9-]{1,63}(?<!-)\.)+[A-Za-z]{2,63}$/;
      if (!fqdnPattern.test(domain)) {
        setError(`Formato de dominio inválido: ${domain}. Use formato FQDN (ej: ejemplo.com)`);
        return false;
      }
    }
    
    return true;
  };

  const simulateProgress = () => {
    // Simular progreso durante el provisionamiento
    setProgress(0);
    setCurrentStep('Generando subdominio único...');
    
    const steps = [
      { progress: 20, step: 'Creando registro CNAME...' },
      { progress: 40, step: 'Creando Custom Hostname...' },
      { progress: 60, step: 'Esperando activación SSL...' },
      { progress: 80, step: 'Aplicando reglas de seguridad...' },
      { progress: 95, step: 'Finalizando provisionamiento...' }
    ];
    
    let currentIndex = 0;
    const interval = setInterval(() => {
      if (currentIndex < steps.length) {
        setProgress(steps[currentIndex].progress);
        setCurrentStep(steps[currentIndex].step);
        currentIndex++;
      } else {
        clearInterval(interval);
      }
    }, 3000); // Cambiar cada 3 segundos
    
    return interval;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    const progressInterval = simulateProgress();

    const validUrls = urls.filter(url => url.trim());

    try {
      const response = await fetch('/api/csaas-provision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_name: formData.client_name,
          client_id: formData.client_id || undefined,
          urls: validUrls
        }),
        signal: AbortSignal.timeout(120000) // 120 segundos timeout
      });

      clearInterval(progressInterval);
      setProgress(100);
      setCurrentStep('Completado');

      const contentType = response.headers.get('content-type') || '';
      const result = contentType.includes('application/json')
        ? await response.json()
        : { message: await response.text() };

      if (!response.ok) {
        // Construir mensaje de error detallado
        let errorMsg = result.message || 'Error al provisionar el cliente';
        
        // Si hay logs, mostrar los últimos 5
        if (result.logs && result.logs.length > 0) {
          const lastLogs = result.logs.slice(-5).join('\n');
          errorMsg += '\n\nÚltimos logs:\n' + lastLogs;
        }
        
        // Si hay detalles adicionales
        if (result.details) {
          const errors = result.details.errors || [];
          if (errors.length > 0) {
            errorMsg += '\n\nErrores de Cloudflare:\n';
            errors.forEach((err: any) => {
              errorMsg += `• [${err.code}] ${err.message}\n`;
            });
          }
        }
        
        setError(errorMsg);
        
        if (import.meta.env.DEV) {
          console.error('Error details:', result);
        }
        return;
      }
      
      // Reset form
      setFormData({
        client_name: '',
        client_id: '',
        email: '',
        phone: '',
      });
      setUrls(['']);
      
      // Llamar callback de éxito
      onSuccess({
        message: result.message || 'Cliente provisionado exitosamente',
        subdomain: result.subdomain,
        protected_url: result.protected_url,
        origin_urls: result.origin_urls,
        logs: result.logs
      });
    } catch (err) {
      clearInterval(progressInterval);
      setError(err instanceof Error 
        ? `Error de conexión: ${err.message}` 
        : 'Error al conectar con el servidor');
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
              <Globe className="w-6 h-6 text-cyan-400" />
              <motion.div
                className="absolute inset-0 bg-cyan-400/20 rounded-full blur-xl"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold gradient-text">Protección CSaaS</h2>
              <p className="text-xs text-gray-400">Cloudflare for SaaS - Subdominio Automático</p>
            </div>
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
                <p className="text-red-400 text-sm whitespace-pre-wrap font-mono">{error}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Info Box */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass border-l-4 border-cyan-400 bg-cyan-900/20 p-4 rounded-r-xl"
          >
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-cyan-300 text-sm font-semibold mb-1">
                  Sistema CSaaS Automático
                </p>
                <p className="text-cyan-300/80 text-xs">
                  Generaremos un subdominio único bajo <strong>suncarsrl.com</strong> para proteger sus URLs sin modificar su DNS.
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <label htmlFor="client_name" className="block text-sm font-medium text-gray-300 mb-2">
              Nombre del Cliente *
            </label>
            <input
              type="text"
              id="client_name"
              required
              value={formData.client_name}
              onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
              className="w-full px-4 py-3 glass border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/20 transition-all"
              placeholder="Acme Corporation"
            />
            <p className="text-xs text-gray-500 mt-1">
              Se usará para generar el subdominio (ej: acme-abc123.suncarsrl.com)
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 }}
          >
            <label htmlFor="client_id" className="block text-sm font-medium text-gray-300 mb-2">
              ID del Cliente (Opcional)
            </label>
            <input
              type="text"
              id="client_id"
              value={formData.client_id}
              onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
              className="w-full px-4 py-3 glass border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/20 transition-all"
              placeholder="CLI-12345"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
              Correo Electrónico (Opcional)
            </label>
            <input
              type="email"
              id="email"
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
            <label className="block text-sm font-medium text-gray-300 mb-2">
              URLs del Cliente a Proteger (FQDN) *
            </label>
            <p className="text-xs text-gray-400 mb-3">
              Dominios del cliente que se protegerán a través del subdominio generado
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
                      placeholder="app.cliente.com"
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

          {/* Progress Bar */}
          {isSubmitting && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass p-4 rounded-xl"
            >
              <div className="flex items-center gap-3 mb-3">
                <Clock className="w-5 h-5 text-cyan-400 animate-pulse" />
                <span className="text-sm text-gray-300">{currentStep}</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-cyan-500 to-blue-600"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-2 text-center">
                {progress}% completado
              </p>
            </motion.div>
          )}

          <motion.button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-bold py-4 px-6 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 hover-glow"
            whileHover={{ scale: isSubmitting ? 1 : 1.02 }}
            whileTap={{ scale: isSubmitting ? 1 : 0.98 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="animate-spin w-5 h-5" />
                <span>Provisionando Cliente...</span>
              </>
            ) : (
              <>
                <Shield className="w-5 h-5" />
                <span>Provisionar Protección CSaaS</span>
                <Sparkles className="w-4 h-4" />
              </>
            )}
          </motion.button>
        </form>
      </motion.div>
    </motion.div>
  );
}
