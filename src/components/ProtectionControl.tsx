import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { 
  Loader2, 
  Shield, 
  ShieldOff, 
  RefreshCw, 
  CheckCircle2, 
  XCircle,
  Lock,
  Unlock,
  AlertTriangle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

interface ProtectionStatus {
  waf: boolean | null;
  https_redirect: boolean | null;
  security_level: string | null;
  firewall_rules: Array<{
    id: string;
    description: string;
    action: string;
    enabled: boolean;
  }>;
  overall_enabled: boolean;
}

interface ProtectionControlProps {
  domain?: string;
}

export default function ProtectionControl({ domain }: ProtectionControlProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [status, setStatus] = useState<ProtectionStatus | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/toggle-protection", {
        method: "GET",
      });

      const data = await response.json();
      
      if (data.status === "ok") {
        setStatus(data.protection_status);
        setLastUpdate(new Date());
      } else {
        toast({
          title: "Error",
          description: data.message || "No se pudo obtener el estado de protecciones",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Error al conectar con el servidor",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleProtection = async (enable: boolean) => {
    setToggling(true);
    try {
      const response = await fetch("/api/toggle-protection", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          enable,
          domain 
        }),
      });

      const data = await response.json();
      
      if (data.status === "ok") {
        setStatus(data.protection_status);
        setLastUpdate(new Date());
        
        toast({
          title: enable ? "✅ Protecciones Activadas" : "⏸️ Protecciones Desactivadas",
          description: data.message,
        });
      } else {
        toast({
          title: "Error",
          description: data.message || "No se pudo cambiar el estado de protecciones",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Error al conectar con el servidor",
      });
    } finally {
      setToggling(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const isEnabled = status?.overall_enabled ?? false;

  return (
    <Card className="glass p-4 sm:p-6 border-white/10">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.div
              animate={{ 
                scale: isEnabled ? [1, 1.1, 1] : 1,
                rotate: isEnabled ? [0, 5, -5, 0] : 0
              }}
              transition={{ duration: 0.5 }}
            >
              {isEnabled ? (
                <Shield className="w-6 h-6 text-green-400" />
              ) : (
                <ShieldOff className="w-6 h-6 text-gray-400" />
              )}
            </motion.div>
            <div>
              <h3 className="text-lg font-semibold gradient-text">
                Control de Protección
              </h3>
              <p className="text-xs text-gray-400">
                {domain ? `Dominio: ${domain}` : "Protecciones globales"}
              </p>
            </div>
          </div>
          
          <motion.button
            onClick={fetchStatus}
            disabled={loading}
            className="glass glass-hover p-2 rounded-lg disabled:opacity-50"
            whileHover={{ scale: loading ? 1 : 1.1 }}
            whileTap={{ scale: loading ? 1 : 0.9 }}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </motion.button>
        </div>

        {/* Estado General */}
        {status && (
          <AnimatePresence mode="wait">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <Alert className={`border-l-4 ${
                isEnabled 
                  ? 'border-green-400 bg-green-900/20' 
                  : 'border-gray-400 bg-gray-900/20'
              }`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    {isEnabled ? (
                      <Lock className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                    ) : (
                      <Unlock className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                    )}
                    <div>
                      <h4 className={`font-semibold mb-1 ${
                        isEnabled ? 'text-green-200' : 'text-gray-200'
                      }`}>
                        {isEnabled ? '🛡️ Protección Activa' : '⏸️ Protección Desactivada'}
                      </h4>
                      <p className={`text-sm ${
                        isEnabled ? 'text-green-300' : 'text-gray-400'
                      }`}>
                        {isEnabled 
                          ? 'Todas las políticas de seguridad están aplicadas y protegiendo tu dominio.'
                          : 'Las políticas de seguridad están desactivadas. Tu dominio no está protegido.'}
                      </p>
                    </div>
                  </div>
                  
                  <Badge className={`${
                    isEnabled 
                      ? 'bg-green-400/20 text-green-400 border-green-400' 
                      : 'bg-gray-400/20 text-gray-400 border-gray-400'
                  }`}>
                    {isEnabled ? 'Activo' : 'Inactivo'}
                  </Badge>
                </div>
              </Alert>
            </motion.div>
          </AnimatePresence>
        )}

        {/* Detalles de Protecciones */}
        {status && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* WAF */}
            <div className="glass p-3 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-300">WAF</span>
                {status.waf === true ? (
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                ) : status.waf === false ? (
                  <XCircle className="w-4 h-4 text-red-400" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-yellow-400" />
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {status.waf === true ? 'Activado' : status.waf === false ? 'Desactivado' : 'Desconocido'}
              </p>
            </div>

            {/* HTTPS Redirect */}
            <div className="glass p-3 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-300">HTTPS Redirect</span>
                {status.https_redirect === true ? (
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                ) : status.https_redirect === false ? (
                  <XCircle className="w-4 h-4 text-red-400" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-yellow-400" />
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {status.https_redirect === true ? 'Activado' : status.https_redirect === false ? 'Desactivado' : 'Desconocido'}
              </p>
            </div>

            {/* Security Level */}
            <div className="glass p-3 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-300">Nivel de Seguridad</span>
                {status.security_level === 'high' ? (
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                ) : status.security_level ? (
                  <AlertTriangle className="w-4 h-4 text-yellow-400" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-400" />
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {status.security_level || 'Desconocido'}
              </p>
            </div>

            {/* Firewall Rules */}
            <div className="glass p-3 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-300">Reglas Firewall</span>
                {status.firewall_rules.length > 0 && status.firewall_rules.every(r => r.enabled) ? (
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                ) : status.firewall_rules.length > 0 ? (
                  <AlertTriangle className="w-4 h-4 text-yellow-400" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-400" />
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {status.firewall_rules.length} regla(s) CAS
              </p>
            </div>
          </div>
        )}

        {/* Botones de Control */}
        <div className="flex gap-3 pt-2">
          <motion.button
            onClick={() => toggleProtection(true)}
            disabled={toggling || isEnabled}
            className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold py-3 px-4 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            whileHover={{ scale: (toggling || isEnabled) ? 1 : 1.02 }}
            whileTap={{ scale: (toggling || isEnabled) ? 1 : 0.98 }}
          >
            {toggling ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Activando...
              </>
            ) : (
              <>
                <Shield className="w-4 h-4" />
                Activar Protección
              </>
            )}
          </motion.button>

          <motion.button
            onClick={() => toggleProtection(false)}
            disabled={toggling || !isEnabled}
            className="flex-1 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white font-semibold py-3 px-4 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            whileHover={{ scale: (toggling || !isEnabled) ? 1 : 1.02 }}
            whileTap={{ scale: (toggling || !isEnabled) ? 1 : 0.98 }}
          >
            {toggling ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Desactivando...
              </>
            ) : (
              <>
                <ShieldOff className="w-4 h-4" />
                Desactivar Protección
              </>
            )}
          </motion.button>
        </div>

        {/* Última actualización */}
        {lastUpdate && (
          <p className="text-xs text-gray-500 text-center">
            Última actualización: {lastUpdate.toLocaleString()}
          </p>
        )}
      </div>
    </Card>
  );
}
