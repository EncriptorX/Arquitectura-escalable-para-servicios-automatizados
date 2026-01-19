import { useState, FormEvent, useEffect } from 'react';
import { X, Plus, Loader2 } from 'lucide-react';

// --- Declaración global para TypeScript ---
declare global {
  interface Window {
    turnstile: any;
  }
}

const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY;

interface ServiceRequestFormProps {
  onClose: () => void;
}

export default function ServiceRequestForm({ onClose }: ServiceRequestFormProps) {
  const [formData, setFormData] = useState({
    company_name: '',
    contact_name: '',
    email: '',
    phone: '',
    comments: '',
  });
  const [urls, setUrls] = useState(['']);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [error, setError] = useState('');

  // Estado para el token de Turnstile
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  // Efecto para cargar el script de Cloudflare y asegurar que window.turnstile esté disponible
  useEffect(() => {
    const scriptId = 'cloudflare-turnstile-script';
    if (!document.getElementById(scriptId)) {
        const script = document.createElement('script');
        script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
        script.id = scriptId;
        script.async = true;
        script.defer = true;
        document.body.appendChild(script);
    }
  }, []);

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
    if (!formData.company_name.trim()) {
      setError('El nombre de la empresa es requerido');
      return false;
    }
    if (!formData.contact_name.trim()) {
      setError('El nombre del responsable es requerido');
      return false;
    }
    if (!formData.email.trim() || !formData.email.includes('@')) {
      setError('Un correo electrónico válido es requerido');
      return false;
    }
    const validUrls = urls.filter(url => url.trim() !== '');
    if (validUrls.length === 0) {
      setError('Debe proporcionar al menos una URL');
      return false;
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

    const validUrls = urls.filter(url => url.trim() !== '');

    try {
      const response = await fetch('/solicitar-proteccion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          company: formData.company_name,
          email: formData.email,
          urls: validUrls,
          turnstileToken // Enviamos el token al backend
        })
      });

      const result = await response.json();

      if (!response.ok) {
        const errorMessage = result.message || 'Error al enviar la solicitud';
        setError(errorMessage);
        setIsSubmitting(false);
        setTurnstileToken(null); // Reseteamos el token si hay error
        // Opcional: Aquí podrías forzar el reset del widget visualmente si tienes la ID del widget
        return;
      }

      setSubmitSuccess(true);
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      const errorMessage = err instanceof Error 
        ? `Error de conexión: ${err.message}` 
        : 'Error al conectar con el servidor. Verifica que el backend Flask esté corriendo.';
      setError(errorMessage);
      console.error('Error submitting request:', err);
      setIsSubmitting(false);
    }
  };

  if (submitSuccess) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-900 rounded-lg shadow-2xl max-w-md w-full p-8 text-center border border-cyan-500">
          <div className="w-16 h-16 bg-cyan-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-2xl font-bold text-white mb-2">¡Solicitud Enviada!</h3>
          <p className="text-gray-300">Nos pondremos en contacto pronto</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className="bg-gray-900 rounded-lg shadow-2xl max-w-2xl w-full my-8 border border-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-2xl font-bold text-white">Solicitud de Protección Perimetral</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white hover:bg-gray-800 p-2 rounded-lg transition-all"
            aria-label="Cerrar"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-500 bg-opacity-10 border border-red-500 text-red-500 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="company_name" className="block text-sm font-medium text-gray-300 mb-2">
              Nombre de la Empresa *
            </label>
            <input
              type="text"
              id="company_name"
              required
              value={formData.company_name}
              onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>

          <div>
            <label htmlFor="contact_name" className="block text-sm font-medium text-gray-300 mb-2">
              Nombre del Responsable *
            </label>
            <input
              type="text"
              id="contact_name"
              required
              value={formData.contact_name}
              onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
              Correo Electrónico *
            </label>
            <input
              type="email"
              id="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-300 mb-2">
              Teléfono (Opcional)
            </label>
            <input
              type="tel"
              id="phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              URLs a Proteger *
            </label>
            <div className="space-y-3">
              {urls.map((url, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => updateUrl(index, e.target.value)}
                    placeholder="https://ejemplo.com"
                    className="flex-1 px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-cyan-500 transition-colors"
                  />
                  {urls.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeUrlField(index)}
                      className="px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                      aria-label="Eliminar URL"
                    >
                      <X size={20} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addUrlField}
              className="mt-3 flex items-center gap-2 text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              <Plus size={20} />
              <span>Agregar otra URL</span>
            </button>
          </div>

          <div>
            <label htmlFor="comments" className="block text-sm font-medium text-gray-300 mb-2">
              Comentarios Adicionales
            </label>
            <textarea
              id="comments"
              rows={4}
              value={formData.comments}
              onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-cyan-500 transition-colors resize-none"
            />
          </div>

          {/* Widget de Turnstile */}
          <div className="flex justify-center py-2">
            <div
              className="cf-turnstile"
              data-sitekey={TURNSTILE_SITE_KEY}
              data-theme="dark"
              ref={(el) => {
                 // Renderizado manual seguro gracias a la declaración global
                 if (el && window.turnstile) {
                     // Solo renderizamos si no tiene contenido (para evitar doble render en re-renders de React)
                     if (el.innerHTML === "") {
                        window.turnstile.render(el, {
                            sitekey: TURNSTILE_SITE_KEY,
                            theme: 'dark',
                            callback: (token: string) => setTurnstileToken(token),
                        });
                     }
                 }
              }}
            ></div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-bold py-4 px-6 rounded-lg transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                <span>Enviando...</span>
              </>
            ) : (
              <span>Solicitar Protección</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}