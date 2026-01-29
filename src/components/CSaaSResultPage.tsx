import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  CheckCircle, 
  Copy, 
  ExternalLink, 
  ArrowLeft, 
  Globe, 
  Shield,
  Link as LinkIcon,
  Server,
  Lock,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface CSaaSResultPageProps {
  subdomain: string;
  protected_url: string;
  origin_urls: string[];
  message: string;
  logs?: string[];
  onBack: () => void;
  onNewRequest: () => void;
}

export default function CSaaSResultPage({
  subdomain,
  protected_url,
  origin_urls,
  message,
  logs,
  onBack,
  onNewRequest
}: CSaaSResultPageProps) {
  const [copied, setCopied] = useState(false);
  const [showLogs, setShowLogs] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-black to-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", duration: 0.6 }}
            className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-green-500 to-green-600 rounded-full mb-4"
          >
            <CheckCircle className="w-10 h-10 text-white" />
          </motion.div>
          <h1 className="text-3xl sm:text-4xl font-bold gradient-text mb-2">
            ¡Protección CSaaS Activada!
          </h1>
          <p className="text-gray-400 text-lg">
            {message}
          </p>
        </motion.div>

        {/* Main Info Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass p-6 sm:p-8 rounded-2xl mb-6 border-white/10"
        >
          <div className="space-y-6">
            {/* Protected URL */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Globe className="w-5 h-5 text-cyan-400" />
                <h2 className="text-lg font-semibold text-white">URL Protegida</h2>
              </div>
              <div className="glass p-4 rounded-xl border border-cyan-400/30 bg-cyan-900/10">
                <div className="flex items-center justify-between gap-3">
                  <a
                    href={protected_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-cyan-400 hover:text-cyan-300 font-mono text-sm sm:text-base break-all flex-1"
                  >
                    {protected_url}
                  </a>
                  <div className="flex gap-2 flex-shrink-0">
                    <motion.button
                      onClick={() => copyToClipboard(protected_url)}
                      className="glass glass-hover p-2 rounded-lg"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      title="Copiar URL"
                    >
                      <Copy className="w-4 h-4 text-gray-400" />
                    </motion.button>
                    <motion.a
                      href={protected_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="glass glass-hover p-2 rounded-lg"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      title="Abrir en nueva pestaña"
                    >
                      <ExternalLink className="w-4 h-4 text-gray-400" />
                    </motion.a>
                  </div>
                </div>
                {copied && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="text-xs text-green-400 mt-2"
                  >
                    ✓ Copiado al portapapeles
                  </motion.p>
                )}
              </div>
            </div>

            {/* Subdomain */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Server className="w-5 h-5 text-blue-400" />
                <h2 className="text-lg font-semibold text-white">Subdominio Generado</h2>
              </div>
              <div className="glass p-4 rounded-xl">
                <p className="text-gray-300 font-mono text-sm sm:text-base break-all">
                  {subdomain}
                </p>
              </div>
            </div>

            {/* Origin URLs */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <LinkIcon className="w-5 h-5 text-purple-400" />
                <h2 className="text-lg font-semibold text-white">URLs de Origen Protegidas</h2>
              </div>
              <div className="space-y-2">
                {origin_urls.map((url, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + index * 0.1 }}
                    className="glass p-3 rounded-lg flex items-center gap-3"
                  >
                    <Shield className="w-4 h-4 text-green-400 flex-shrink-0" />
                    <span className="text-gray-300 font-mono text-sm break-all">
                      {url}
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Security Features */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Lock className="w-5 h-5 text-green-400" />
                <h2 className="text-lg font-semibold text-white">Protecciones Aplicadas</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { label: 'SSL/TLS Automático', icon: Lock },
                  { label: 'WAF Activado', icon: Shield },
                  { label: 'HTTPS Redirect', icon: LinkIcon },
                  { label: 'Security Level: High', icon: Shield },
                  { label: 'Bot Fight Mode', icon: Shield },
                  { label: 'Browser Integrity Check', icon: Lock },
                  { label: 'Rate Limiting', icon: Shield },
                  { label: 'Challenge Passage', icon: Lock }
                ].map((feature, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4 + index * 0.05 }}
                    className="glass p-3 rounded-lg flex items-center gap-3"
                  >
                    <div className="bg-green-500/20 p-2 rounded-lg">
                      <feature.icon className="w-4 h-4 text-green-400" />
                    </div>
                    <span className="text-sm text-gray-300">{feature.label}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Logs Section */}
        {logs && logs.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="glass p-6 rounded-2xl mb-6 border-white/10"
          >
            <button
              onClick={() => setShowLogs(!showLogs)}
              className="flex items-center justify-between w-full text-left"
            >
              <div className="flex items-center gap-2">
                <Server className="w-5 h-5 text-gray-400" />
                <h2 className="text-lg font-semibold text-white">Logs de Provisionamiento</h2>
              </div>
              {showLogs ? (
                <ChevronUp className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              )}
            </button>
            
            {showLogs && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4"
              >
                <div className="bg-black/50 p-4 rounded-xl max-h-96 overflow-y-auto custom-scrollbar">
                  <pre className="text-xs text-gray-300 font-mono whitespace-pre-wrap">
                    {logs.join('\n')}
                  </pre>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* Instructions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="glass p-6 rounded-2xl mb-6 border-white/10 border-l-4 border-cyan-400"
        >
          <h3 className="text-lg font-semibold text-white mb-3">📋 Instrucciones de Configuración DNS</h3>
          <div className="space-y-4 text-sm text-gray-300">
            <div className="bg-cyan-900/20 p-4 rounded-lg border border-cyan-400/30">
              <p className="font-semibold text-cyan-400 mb-3">✅ Configuración Recomendada: Mantener tu dominio original</p>
              <ol className="space-y-3 ml-4">
                <li className="flex gap-2">
                  <span className="text-cyan-400 font-bold">1.</span>
                  <div>
                    <p className="font-semibold mb-1">Accede al panel DNS de tu dominio</p>
                    <p className="text-xs text-gray-400">Ve al proveedor donde registraste tu dominio (GoDaddy, Namecheap, etc.)</p>
                  </div>
                </li>
                <li className="flex gap-2">
                  <span className="text-cyan-400 font-bold">2.</span>
                  <div>
                    <p className="font-semibold mb-2">Crea un registro CNAME con estos valores:</p>
                    <div className="glass p-4 rounded-lg font-mono text-xs space-y-2 bg-black/30">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Tipo:</span>
                        <span className="text-green-400 font-bold">CNAME</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Nombre:</span>
                        <span className="text-green-400 font-bold">www</span>
                        <span className="text-xs text-gray-500 ml-2">(o @ para dominio raíz)</span>
                      </div>
                      <div className="flex flex-col">
                        <div className="flex justify-between mb-1">
                          <span className="text-gray-400">Valor:</span>
                          <button
                            onClick={() => copyToClipboard(subdomain)}
                            className="text-cyan-400 hover:text-cyan-300 text-xs flex items-center gap-1"
                          >
                            <Copy className="w-3 h-3" />
                            Copiar
                          </button>
                        </div>
                        <span className="text-green-400 font-bold break-all">{subdomain}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">TTL:</span>
                        <span className="text-green-400 font-bold">Auto o 3600</span>
                      </div>
                    </div>
                  </div>
                </li>
                <li className="flex gap-2">
                  <span className="text-cyan-400 font-bold">3.</span>
                  <div>
                    <p className="font-semibold mb-1">Espera la propagación DNS</p>
                    <p className="text-xs text-gray-400">Normalmente toma entre 5-30 minutos, pero puede tardar hasta 48 horas</p>
                  </div>
                </li>
                <li className="flex gap-2">
                  <span className="text-cyan-400 font-bold">4.</span>
                  <div>
                    <p className="font-semibold mb-1">¡Listo! Tu dominio está protegido</p>
                    <p className="text-xs text-gray-400">Accede a tu dominio original y verás el contenido protegido por Cloudflare</p>
                  </div>
                </li>
              </ol>
            </div>
            
            <div className="border-t border-white/10 pt-4">
              <p className="font-semibold text-purple-400 mb-2">🔄 Arquitectura del Proxy (Plan Gratuito)</p>
              <div className="space-y-2 text-xs">
                <p className="text-gray-400">
                  El subdominio <span className="text-cyan-400 font-mono">{subdomain}</span> actúa como proxy reverso:
                </p>
                <div className="glass p-3 rounded-lg bg-black/30 font-mono text-xs">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-blue-400">Cliente</span>
                    <span className="text-gray-500">→</span>
                    <span className="text-cyan-400">{subdomain}</span>
                    <span className="text-gray-500">→</span>
                    <span className="text-purple-400">Backend Proxy</span>
                    <span className="text-gray-500">→</span>
                    <span className="text-green-400">{origin_urls[0]}</span>
                  </div>
                  <p className="text-gray-500 text-[10px]">
                    El backend proxy lee el header Host, identifica el subdominio y reenvía la solicitud al dominio real del cliente
                  </p>
                </div>
              </div>
            </div>
            
            <div className="border-t border-white/10 pt-4">
              <p className="text-yellow-400 text-xs flex items-start gap-2">
                <span className="flex-shrink-0">⚠️</span>
                <span>
                  <strong>Importante:</strong> Esta arquitectura está optimizada para el plan gratuito de Cloudflare. 
                  No se usa <code className="bg-black/30 px-1 rounded">custom_origin_server</code> ni <code className="bg-black/30 px-1 rounded">custom_origin_sni</code> 
                  (no disponibles en plan Free). El proxy se maneja completamente en el backend.
                </span>
              </p>
            </div>
          </div>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="flex flex-col sm:flex-row gap-4"
        >
          <motion.button
            onClick={onBack}
            className="flex-1 glass glass-hover px-6 py-4 rounded-xl font-semibold flex items-center justify-center gap-2"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Volver al Inicio</span>
          </motion.button>
          
          <motion.button
            onClick={onNewRequest}
            className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 px-6 py-4 rounded-xl font-semibold flex items-center justify-center gap-2 hover-glow"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Globe className="w-5 h-5" />
            <span>Provisionar Otro Cliente</span>
          </motion.button>
        </motion.div>
      </div>
    </div>
  );
}
