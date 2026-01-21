import { LogTerminal } from "@/components/log-terminal";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Globe, Shield, Activity, Copy, Check, AlertTriangle, ArrowLeft, Repeat } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";

interface ProcessInfoPageProps {
  urls: string[];
  message: string;
  output?: string;
  onBack: () => void;
  onNewRequest: () => void;
}

export default function ProcessInfoPage({
  urls,
  message,
  output,
  onBack,
  onNewRequest,
}: ProcessInfoPageProps) {
  const { toast } = useToast();
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [status, setStatus] = useState<'processing' | 'waiting_dns' | 'completed' | 'failed'>('processing');
  const [nameservers, setNameservers] = useState<string[]>([]);
  const [allLogs, setAllLogs] = useState<string[]>([]);
  const [currentLogIndex, setCurrentLogIndex] = useState(0);
  const [isSimulationMode, setIsSimulationMode] = useState<boolean | null>(null);

  useEffect(() => {
    if (!output) {
      setAllLogs([
        'ERROR: No se recibió respuesta del servidor',
        'El API no retornó ningún output',
        'Por favor verifica que el backend esté funcionando correctamente'
      ]);
      return;
    }

    try {
      const apiResponse = JSON.parse(output);
      
      setIsSimulationMode(apiResponse.simulation_mode === true);
      
      if (apiResponse.logs && Array.isArray(apiResponse.logs)) {
        setAllLogs(apiResponse.logs);
      } else {
        setAllLogs([
          'ERROR: No se recibieron logs del servidor',
          'Respuesta del API no contiene logs válidos',
          'Por favor revisa la configuración del backend'
        ]);
      }
      
      if (apiResponse.nameservers && Array.isArray(apiResponse.nameservers)) {
        setNameservers(apiResponse.nameservers);
      }
    } catch (e) {
      setAllLogs([
        'ERROR: No se pudo parsear la respuesta del servidor',
        `Error: ${e instanceof Error ? e.message : 'Unknown error'}`,
        'Por favor revisa la consola del navegador para más detalles'
      ]);
    }
  }, [output]);

  useEffect(() => {
    if (allLogs.length === 0 || currentLogIndex >= allLogs.length) {
      if (currentLogIndex >= allLogs.length && allLogs.length > 0) {
        setProgress(100);
        setStatus(nameservers.length > 0 ? 'waiting_dns' : 'completed');
      }
      return;
    }

    const timer = setTimeout(() => {
      setLogs(prev => [...prev, allLogs[currentLogIndex]]);
      setCurrentLogIndex(prev => prev + 1);
      setProgress(Math.floor(((currentLogIndex + 1) / allLogs.length) * 100));
    }, 300);

    return () => clearTimeout(timer);
  }, [allLogs.length, currentLogIndex, nameservers.length]);

  const isComplete = status === 'completed';
  const isFailed = status === 'failed';
  const isActionRequired = status === 'waiting_dns';

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Nameserver copied to clipboard.",
      duration: 2000,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-black to-gray-900">
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
            
            <div className="flex gap-3">
              <motion.button
                onClick={onBack}
                className="glass glass-hover px-4 py-2 rounded-full text-sm font-medium"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <ArrowLeft className="w-4 h-4 inline mr-2" />
                <span className="hidden sm:inline">Volver</span>
              </motion.button>
              
              <motion.button
                onClick={onNewRequest}
                className="glass glass-hover px-4 py-2 rounded-full text-sm font-medium hover-glow"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Repeat className="w-4 h-4 inline mr-2" />
                <span className="hidden sm:inline gradient-text">Nueva Solicitud</span>
                <span className="sm:hidden gradient-text">Nueva</span>
              </motion.button>
            </div>
          </div>
        </div>
      </motion.header>

      <main className="pt-24 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto space-y-8">
          {/* Simulation Mode Warning */}
          {isSimulationMode === true && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass border-l-4 border-orange-400 rounded-r-2xl overflow-hidden"
            >
              <div className="p-6">
                <div className="flex items-start space-x-4">
                  <div className="p-2 bg-orange-400/20 rounded-xl text-orange-400 flex-shrink-0">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-orange-200 mb-2">
                      ⚠️ MODO SIMULACIÓN ACTIVO
                    </h3>
                    <p className="text-orange-300 mb-2 text-sm">
                      El servicio está corriendo en <strong>modo simulación</strong>. No se aplicó protección real de Cloudflare.
                    </p>
                    <p className="text-orange-300/80 text-xs">
                      Para activar la protección real, configura <code className="glass px-2 py-1 rounded text-xs">CF_API_TOKEN</code> y <code className="glass px-2 py-1 rounded text-xs">CF_ZONE_ID</code> en Vercel.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Real Mode Confirmation */}
          {isSimulationMode === false && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass border-l-4 border-green-400 rounded-r-2xl overflow-hidden animate-glow"
            >
              <div className="p-6">
                <div className="flex items-start space-x-4">
                  <div className="p-2 bg-green-400/20 rounded-xl text-green-400 flex-shrink-0">
                    <Check className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-green-200 mb-2">
                      ✅ MODO REAL ACTIVO
                    </h3>
                    <p className="text-green-300 text-sm">
                      El servicio aplicó protección perimetral <strong>REAL</strong> de Cloudflare a tu dominio.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
          
          {/* Header Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-4"
          >
            <div>
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold gradient-text">Deployment Status</h1>
                <Badge
                  variant="outline"
                  className={`glass ${isComplete ? "border-green-400 text-green-400" : ""}
                    ${isFailed ? "border-red-400 text-red-400" : ""}
                    ${!isComplete && !isFailed ? "border-cyan-400 text-cyan-400 animate-pulse" : ""}`}
                >
                  {status.replace(/_/g, " ").toUpperCase()}
                </Badge>
              </div>
              <p className="text-gray-400 text-sm">{message}</p>
            </div>
            <div className="flex flex-wrap gap-6 text-sm text-gray-400 border-l-2 border-cyan-400/30 pl-6">
              <div className="flex flex-col">
                <span className="font-medium text-white">Target Domains</span>
                <span>{urls.length} domain(s)</span>
              </div>
            </div>
          </motion.div>

          {/* Progress Section */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Card className="glass p-6 border-white/10">
              <div className="space-y-4">
                <div className="flex justify-between text-sm font-medium">
                  <span className="text-gray-300">Overall Progress</span>
                  <span className="gradient-text font-bold">{progress}%</span>
                </div>
                <div className="relative h-3 w-full overflow-hidden rounded-full bg-white/5">
                  <motion.div
                    className={`h-full ${isFailed ? "bg-gradient-to-r from-red-500 to-red-600" : "bg-gradient-to-r from-cyan-500 to-blue-600"}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                  />
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                    animate={{ x: ["-100%", "200%"] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4">
                  <StepIndicator label="Analyzing" active={progress > 0} completed={progress >= 25} icon={Globe} />
                  <StepIndicator label="Provisioning" active={progress >= 25} completed={progress >= 50} icon={Activity} />
                  <StepIndicator label="Securing" active={progress >= 50} completed={progress >= 75} icon={Shield} />
                  <StepIndicator label="Finalizing" active={progress >= 75} completed={progress === 100} icon={Check} />
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Action Required Box */}
          {isActionRequired && nameservers.length > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="border-l-4 border-yellow-500 bg-yellow-900/20 rounded-r-lg overflow-hidden shadow-sm"
            >
              <div className="p-4 sm:p-5 md:p-6">
                <div className="flex items-start space-x-3 sm:space-x-4">
                  <div className="p-1.5 sm:p-2 bg-yellow-900/40 rounded-full text-yellow-400 flex-shrink-0">
                    <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base sm:text-lg font-bold text-yellow-200 mb-1.5 sm:mb-2">
                      Action Required: Update Nameservers
                    </h3>
                    <p className="text-yellow-300 text-sm sm:text-base mb-3 sm:mb-4">
                      To complete the setup, please log in to your domain registrar and replace your existing
                      nameservers with the ones below. This delegates authority to Cloudflare.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      {nameservers.map((ns: string, idx: number) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2.5 sm:p-3 bg-gray-900 border border-yellow-800 rounded-md shadow-sm group hover:border-yellow-400 transition-colors"
                        >
                          <code className="font-mono text-xs sm:text-sm text-gray-200 truncate pr-2">{ns}</code>
                          <button
                            onClick={() => copyToClipboard(ns)}
                            className="p-1.5 hover:bg-gray-800 rounded text-gray-400 hover:text-gray-200 transition-colors flex-shrink-0"
                          >
                            <Copy className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 sm:mt-4 flex items-center text-xs text-yellow-400">
                      <Loader2 className="w-3 h-3 mr-1 animate-spin flex-shrink-0" />
                      <span>Waiting for DNS propagation... this may take a few minutes to several hours.</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* URLs Section */}
          <Card className="p-4 sm:p-5 md:p-6 border-gray-800">
            <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">Protected Domains</h2>
            <div className="space-y-2">
              {urls.map((url, idx) => (
                <div key={idx} className="flex items-center justify-between p-2.5 sm:p-3 bg-black rounded-lg gap-2">
                  <span className="text-gray-200 text-sm sm:text-base truncate">{url}</span>
                  <Badge variant="outline" className="bg-blue-900/20 text-blue-400 border-blue-800 text-xs whitespace-nowrap flex-shrink-0">
                    {isComplete ? 'Completed' : 'Processing'}
                  </Badge>
                </div>
              ))}
            </div>
          </Card>

          {/* Logs Terminal */}
          <div className="space-y-2">
            <h2 className="text-base sm:text-lg font-semibold tracking-tight ml-1">Live Execution Logs</h2>
            <LogTerminal logs={logs} className="h-[300px] sm:h-[350px] md:h-[400px]" />
          </div>
        </div>
      </main>
    </div>
  );
}

function StepIndicator({
  label,
  active,
  completed,
  icon: Icon,
}: {
  label: string;
  active: boolean;
  completed: boolean;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`flex flex-col items-center space-y-2 p-3 rounded-xl transition-all ${
        completed ? "glass border-cyan-400/50" : active ? "glass" : "opacity-50"
      }`}
    >
      <motion.div 
        className={`p-2 rounded-full ${completed ? "bg-gradient-to-r from-cyan-500 to-blue-600" : "bg-white/5"}`}
        animate={completed ? { scale: [1, 1.1, 1] } : {}}
        transition={{ duration: 0.3 }}
      >
        <Icon className={`w-5 h-5 ${completed ? "text-white" : active ? "text-cyan-400" : "text-gray-600"}`} />
      </motion.div>
      <span className={`text-xs font-semibold uppercase tracking-wider text-center ${
        completed ? "gradient-text" : active ? "text-white" : "text-gray-600"
      }`}>
        {label}
      </span>
    </motion.div>
  );
}
