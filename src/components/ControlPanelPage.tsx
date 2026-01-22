import { Shield, ArrowLeft, Settings, Plus } from "lucide-react";
import { motion } from "framer-motion";
import ProtectionControl from "@/components/ProtectionControl";

interface ControlPanelPageProps {
  onBack: () => void;
  onRequestProtection: () => void;
}

export default function ControlPanelPage({ onBack, onRequestProtection }: ControlPanelPageProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-black to-gray-900">
      {/* Header */}
      <motion.header 
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className="fixed w-full top-0 z-50 glass backdrop-blur-glass border-b border-white/10"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between gap-4">
            <motion.div 
              className="flex items-center gap-3"
              whileHover={{ scale: 1.05 }}
            >
              <div className="relative">
                <Shield className="text-cyan-400 w-7 h-7" />
                <motion.div
                  className="absolute inset-0 bg-cyan-400/20 rounded-full blur-xl"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              </div>
              <span className="text-xl font-bold gradient-text">SecurePerimeter</span>
            </motion.div>
            
            <div className="flex items-center gap-3">
              <motion.button
                onClick={onRequestProtection}
                className="glass glass-hover px-4 py-2.5 rounded-full font-medium text-sm group"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Plus className="inline-block mr-2 w-4 h-4 text-cyan-400" />
                <span className="gradient-text hidden sm:inline">Solicitar Protección</span>
                <span className="gradient-text sm:hidden">Solicitar</span>
              </motion.button>
              
              <motion.button
                onClick={onBack}
                className="glass glass-hover px-4 py-2 rounded-full text-sm font-medium"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <ArrowLeft className="w-4 h-4 inline mr-2" />
                <span className="hidden sm:inline">Volver al Inicio</span>
                <span className="sm:hidden">Volver</span>
              </motion.button>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <main className="pt-24 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Page Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-4"
          >
            <div className="inline-flex items-center gap-3 glass px-6 py-3 rounded-full">
              <Settings className="w-5 h-5 text-cyan-400" />
              <span className="text-sm font-medium text-gray-300">Panel de Control</span>
            </div>
            
            <h1 className="text-4xl sm:text-5xl font-bold">
              <span className="gradient-text">Control de Protección</span>
            </h1>
            
            <p className="text-lg text-gray-400 max-w-2xl mx-auto">
              Administra las políticas de seguridad de tu dominio. Activa o desactiva la protección según tus necesidades.
            </p>
          </motion.div>

          {/* Info Cards */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-1 sm:grid-cols-3 gap-4"
          >
            <div className="glass p-4 rounded-xl text-center">
              <div className="text-2xl font-bold gradient-text mb-1">24/7</div>
              <div className="text-xs text-gray-400">Disponibilidad</div>
            </div>
            <div className="glass p-4 rounded-xl text-center">
              <div className="text-2xl font-bold gradient-text mb-1">Instantáneo</div>
              <div className="text-xs text-gray-400">Cambios en tiempo real</div>
            </div>
            <div className="glass p-4 rounded-xl text-center">
              <div className="text-2xl font-bold gradient-text mb-1">Total</div>
              <div className="text-xs text-gray-400">Control completo</div>
            </div>
          </motion.div>

          {/* Protection Control Component */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <ProtectionControl />
          </motion.div>

          {/* Call to Action - Solicitar Protección */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="glass p-6 rounded-xl text-center border-2 border-cyan-400/30"
          >
            <h3 className="text-lg font-semibold mb-2 text-white">
              ¿Necesitas proteger un nuevo dominio?
            </h3>
            <p className="text-sm text-gray-400 mb-4">
              Solicita protección perimetral para tus dominios adicionales
            </p>
            <motion.button
              onClick={onRequestProtection}
              className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold py-3 px-6 rounded-lg hover-glow inline-flex items-center gap-2"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Plus className="w-5 h-5" />
              Solicitar Protección para Nuevo Dominio
            </motion.button>
          </motion.div>

          {/* Help Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="glass p-6 rounded-xl"
          >
            <h3 className="text-lg font-semibold mb-4 text-white">
              ℹ️ ¿Cómo funciona?
            </h3>
            <div className="space-y-3 text-sm text-gray-400">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-green-400 text-xs font-bold">1</span>
                </div>
                <div>
                  <strong className="text-white">Activar Protección:</strong> Habilita todas las políticas de seguridad (WAF, HTTPS Redirect, Firewall Rules, etc.)
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-gray-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-gray-400 text-xs font-bold">2</span>
                </div>
                <div>
                  <strong className="text-white">Desactivar Protección:</strong> Desactiva temporalmente las políticas de seguridad sin eliminar la configuración
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-cyan-400 text-xs font-bold">3</span>
                </div>
                <div>
                  <strong className="text-white">Estado en Tiempo Real:</strong> El panel muestra el estado actual de cada componente de seguridad
                </div>
              </div>
            </div>
          </motion.div>

          {/* Warning */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="glass border-l-4 border-yellow-400 bg-yellow-900/20 p-4 rounded-r-xl"
          >
            <div className="flex items-start gap-3">
              <div className="text-yellow-400 flex-shrink-0">⚠️</div>
              <div className="text-sm text-yellow-300">
                <strong className="block mb-1">Importante:</strong>
                Desactivar la protección dejará tu dominio expuesto a amenazas. Solo desactiva si es absolutamente necesario y por el menor tiempo posible.
              </div>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
