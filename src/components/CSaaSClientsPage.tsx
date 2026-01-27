import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Globe, 
  RefreshCw, 
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  ExternalLink,
  Copy
} from 'lucide-react';

interface CSaaSClient {
  id: string;
  hostname: string;
  status: string;
  ssl_status: string;
  created_at: string;
  verification_errors: string[];
}

interface CSaaSClientsPageProps {
  onBack: () => void;
}

export default function CSaaSClientsPage({ onBack }: CSaaSClientsPageProps) {
  const [clients, setClients] = useState<CSaaSClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState<string | null>(null);

  const fetchClients = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/csaas-list');
      const data = await response.json();
      
      if (data.status === 'ok') {
        setClients(data.clients);
      } else {
        setError(data.message || 'Error al cargar clientes');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(text);
    setTimeout(() => setCopied(null), 2000);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-400 animate-pulse" />;
      default:
        return <XCircle className="w-5 h-5 text-red-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-green-400 bg-green-400/20 border-green-400';
      case 'pending':
        return 'text-yellow-400 bg-yellow-400/20 border-yellow-400';
      default:
        return 'text-red-400 bg-red-400/20 border-red-400';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-black to-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <div className="flex items-center gap-4">
            <motion.button
              onClick={onBack}
              className="glass glass-hover p-3 rounded-xl"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <ArrowLeft className="w-5 h-5 text-gray-400" />
            </motion.button>
            <div>
              <h1 className="text-3xl font-bold gradient-text">Clientes CSaaS</h1>
              <p className="text-gray-400 text-sm">
                {clients.length} cliente{clients.length !== 1 ? 's' : ''} provisionado{clients.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          
          <motion.button
            onClick={fetchClients}
            disabled={loading}
            className="glass glass-hover px-4 py-3 rounded-xl flex items-center gap-2"
            whileHover={{ scale: loading ? 1 : 1.05 }}
            whileTap={{ scale: loading ? 1 : 0.95 }}
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Actualizar</span>
          </motion.button>
        </motion.div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <Loader2 className="w-12 h-12 animate-spin mx-auto text-cyan-400 mb-4" />
            <p className="text-gray-400">Cargando clientes...</p>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass border-l-4 border-red-400 p-6 rounded-r-xl"
          >
            <p className="text-red-400">{error}</p>
          </motion.div>
        )}

        {/* Clients List */}
        {!loading && !error && clients.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass p-12 rounded-2xl text-center"
          >
            <Globe className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-400 mb-2">
              No hay clientes provisionados
            </h3>
            <p className="text-gray-500">
              Los clientes CSaaS aparecerán aquí una vez provisionados
            </p>
          </motion.div>
        )}

        {!loading && !error && clients.length > 0 && (
          <div className="space-y-4">
            {clients.map((client, index) => (
              <motion.div
                key={client.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="glass p-6 rounded-2xl border-white/10 hover:border-cyan-400/30 transition-all"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {getStatusIcon(client.status)}
                      <h3 className="text-lg font-semibold text-white">
                        {client.hostname}
                      </h3>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 mb-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(client.status)}`}>
                        Status: {client.status}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(client.ssl_status)}`}>
                        SSL: {client.ssl_status}
                      </span>
                    </div>
                    
                    <p className="text-xs text-gray-500">
                      Creado: {new Date(client.created_at).toLocaleString()}
                    </p>
                    
                    {client.verification_errors.length > 0 && (
                      <div className="mt-2 text-xs text-red-400">
                        Errores: {client.verification_errors.join(', ')}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    <motion.button
                      onClick={() => copyToClipboard(`https://${client.hostname}`)}
                      className="glass glass-hover px-4 py-2 rounded-lg flex items-center gap-2"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      title="Copiar URL"
                    >
                      <Copy className="w-4 h-4" />
                      {copied === `https://${client.hostname}` && (
                        <span className="text-xs text-green-400">✓</span>
                      )}
                    </motion.button>
                    
                    <motion.a
                      href={`https://${client.hostname}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="glass glass-hover px-4 py-2 rounded-lg flex items-center gap-2"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      title="Abrir"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </motion.a>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
