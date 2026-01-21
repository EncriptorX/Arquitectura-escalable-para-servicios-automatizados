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
    // Parsear el output del API para obtener los logs reales
    if (output) {
      try {
        console.log("📥 Raw output received:", output);
        const apiResponse = JSON.parse(output);
        console.log("📦 Parsed API response:", apiResponse);
        
        // Verificar si está en modo simulación
        if (apiResponse.simulation_mode === true) {
          console.warn("⚠️ API está en MODO SIMULACIÓN - No se aplicó protección real");
          setIsSimulationMode(true);
        } else {
          console.log("✅ API está en MODO REAL - Protección aplicada");
          setIsSimulationMode(false);
        }
        
        // Si el API retorna logs, guardarlos todos
        if (apiResponse.logs && Array.isArray(apiResponse.logs)) {
          console.log(`📝 Logs recibidos: ${apiResponse.logs.length} líneas`);
          setAllLogs(apiResponse.logs);
        } else {
          console.warn("⚠️ No se encontraron logs en la respuesta del API");
          setAllLogs([
            'ERROR: No se recibieron logs del servidor',
            'Respuesta del API no contiene logs válidos',
            'Por favor revisa la configuración del backend'
          ]);
        }
        
        // Si el API retorna nameservers, usarlos
        if (apiResponse.nameservers && Array.isArray(apiResponse.nameservers)) {
          console.log("🌐 Nameservers recibidos:", apiResponse.nameservers);
          setNameservers(apiResponse.nameservers);
        }
        
        // Mostrar información adicional si está disponible
        if (apiResponse.sitios && Array.isArray(apiResponse.sitios)) {
          console.log("🎯 Sitios procesados:", apiResponse.sitios);
        }
      } catch (e) {
        console.error("❌ Error parsing output:", e);
        console.error("📄 Output que causó el error:", output);
        // Fallback: logs básicos
        setAllLogs([
          'ERROR: No se pudo parsear la respuesta del servidor',
          `Error: ${e instanceof Error ? e.message : 'Unknown error'}`,
          'Por favor revisa la consola del navegador para más detalles'
        ]);
      }
    } else {
      console.warn("⚠️ No se recibió output del API");
      // Fallback: logs básicos si no hay output
      setAllLogs([
        'ERROR: No se recibió respuesta del servidor',
        'El API no retornó ningún output',
        'Por favor verifica que el backend esté funcionando correctamente'
      ]);
    }
  }, [output, urls.length]);

  useEffect(() => {
    if (allLogs.length === 0) return;

    // Mostrar logs progresivamente
    if (currentLogIndex < allLogs.length) {
      const timer = setTimeout(() => {
        setLogs(prev => [...prev, allLogs[currentLogIndex]]);
        setCurrentLogIndex(prev => prev + 1);
        
        // Actualizar progreso basado en el índice de logs
        const progressPercent = Math.floor(((currentLogIndex + 1) / allLogs.length) * 100);
        setProgress(progressPercent);
      }, 300); // Mostrar un log cada 300ms

      return () => clearTimeout(timer);
    } else {
      // Todos los logs mostrados
      setProgress(100);
      if (nameservers.length > 0) {
        setStatus('waiting_dns');
      } else {
        setStatus('completed');
      }
    }
  }, [allLogs, currentLogIndex, nameservers.length]);

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
    <div className="min-h-screen bg-black text-white">
      <header className="fixed w-full top-0 z-40 bg-black bg-opacity-90 backdrop-blur-sm border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="text-cyan-400" size={32} />
              <span className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                SecurePerimeter
              </span>
            </div>
            <div className="flex gap-3">
              <button
                onClick={onBack}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-700 transition-colors"
              >
                <ArrowLeft size={18} />
                Volver al inicio
              </button>
              <button
                onClick={onNewRequest}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 rounded-lg transition-all transform hover:scale-105"
              >
                <Repeat size={18} />
                Enviar otra solicitud
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="pt-24 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto space-y-8">
          {/* Simulation Mode Warning */}
          {isSimulationMode === true && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="border-l-4 border-orange-500 bg-orange-900/20 rounded-r-lg overflow-hidden shadow-sm"
            >
              <div className="p-6">
                <div className="flex items-start space-x-4">
                  <div className="p-2 bg-orange-900/40 rounded-full text-orange-400">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-orange-200 mb-2">
                      ⚠️ MODO SIMULACIÓN ACTIVO
                    </h3>
                    <p className="text-orange-300 mb-2">
                      El servicio está corriendo en <strong>modo simulación</strong>. No se aplicó protección real de Cloudflare.
                    </p>
                    <p className="text-orange-300 text-sm">
                      Para activar la protección real, configura <code className="bg-orange-900/40 px-2 py-1 rounded">CF_API_TOKEN</code> y <code className="bg-orange-900/40 px-2 py-1 rounded">CF_ZONE_ID</code> en Vercel.
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
              className="border-l-4 border-green-500 bg-green-900/20 rounded-r-lg overflow-hidden shadow-sm"
            >
              <div className="p-6">
                <div className="flex items-start space-x-4">
                  <div className="p-2 bg-green-900/40 rounded-full text-green-400">
                    <Check className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-green-200 mb-2">
                      ✅ MODO REAL ACTIVO
                    </h3>
                    <p className="text-green-300">
                      El servicio aplicó protección perimetral <strong>REAL</strong> de Cloudflare a tu dominio.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
          
          {/* Header Section */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-3 mb-1">
                <h1 className="text-3xl font-bold tracking-tight">Deployment Status</h1>
                <Badge
                  variant="outline"
                  className={`${isComplete ? "bg-green-50 text-green-700 border-green-200" : ""}
                    ${isFailed ? "bg-red-50 text-red-700 border-red-200" : ""}
                    ${!isComplete && !isFailed ? "bg-blue-50 text-blue-700 border-blue-200 animate-pulse" : ""}`}
                >
                  {status.replace(/_/g, " ").toUpperCase()}
                </Badge>
              </div>
              <p className="text-gray-400 text-sm">{message}</p>
            </div>
            <div className="flex space-x-8 text-sm text-gray-400 border-l border-gray-800 pl-8">
              <div className="flex flex-col">
                <span className="font-medium text-white">Target Domains</span>
                <span>{urls.length} domain(s)</span>
              </div>
            </div>
          </div>

          {/* Progress Section */}
          <Card className="p-6 border-gray-800 shadow-sm">
            <div className="space-y-4">
              <div className="flex justify-between text-sm font-medium">
                <span>Overall Progress</span>
                <span>{progress}%</span>
              </div>
              <div className="relative h-3 w-full overflow-hidden rounded-full bg-gray-800">
                <motion.div
                  className={`h-full ${isFailed ? "bg-red-500" : "bg-cyan-500"}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5, ease: "easeInOut" }}
                />
              </div>
              <div className="grid grid-cols-4 gap-2 pt-4">
                <StepIndicator label="Analyzing" active={progress > 0} completed={progress >= 25} icon={Globe} />
                <StepIndicator label="Provisioning" active={progress >= 25} completed={progress >= 50} icon={Activity} />
                <StepIndicator label="Securing" active={progress >= 50} completed={progress >= 75} icon={Shield} />
                <StepIndicator label="Finalizing" active={progress >= 75} completed={progress === 100} icon={Check} />
              </div>
            </div>
          </Card>

          {/* Action Required Box */}
          {isActionRequired && nameservers.length > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="border-l-4 border-yellow-500 bg-yellow-900/20 rounded-r-lg overflow-hidden shadow-sm"
            >
              <div className="p-6">
                <div className="flex items-start space-x-4">
                  <div className="p-2 bg-yellow-900/40 rounded-full text-yellow-400">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-yellow-200 mb-2">
                      Action Required: Update Nameservers
                    </h3>
                    <p className="text-yellow-300 mb-4">
                      To complete the setup, please log in to your domain registrar and replace your existing
                      nameservers with the ones below. This delegates authority to Cloudflare.
                    </p>
                    <div className="grid sm:grid-cols-2 gap-4">
                      {nameservers.map((ns: string, idx: number) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-3 bg-gray-900 border border-yellow-800 rounded-md shadow-sm group hover:border-yellow-400 transition-colors"
                        >
                          <code className="font-mono text-sm text-gray-200">{ns}</code>
                          <button
                            onClick={() => copyToClipboard(ns)}
                            className="p-1.5 hover:bg-gray-800 rounded text-gray-400 hover:text-gray-200 transition-colors"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 flex items-center text-xs text-yellow-400">
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                      Waiting for DNS propagation... this may take a few minutes to several hours.
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* URLs Section */}
          <Card className="p-6 border-gray-800">
            <h2 className="text-xl font-semibold mb-4">Protected Domains</h2>
            <div className="space-y-2">
              {urls.map((url, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-black rounded-lg">
                  <span className="text-gray-200">{url}</span>
                  <Badge variant="outline" className="bg-blue-900/20 text-blue-400 border-blue-800">
                    {isComplete ? 'Completed' : 'Processing'}
                  </Badge>
                </div>
              ))}
            </div>
          </Card>

          {/* Logs Terminal */}
          <div className="space-y-2">
            <h2 className="text-lg font-semibold tracking-tight ml-1">Live Execution Logs</h2>
            <LogTerminal logs={logs} className="h-[400px]" />
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
  icon: any;
}) {
  return (
    <div
      className={`flex flex-col items-center space-y-2 p-3 rounded-lg transition-colors ${
        completed ? "text-cyan-400" : active ? "text-white bg-gray-800/50" : "text-gray-600 opacity-50"
      }`}
    >
      <div className={`p-2 rounded-full ${completed ? "bg-cyan-500/10" : "bg-transparent"}`}>
        <Icon className="w-5 h-5" />
      </div>
      <span className="text-xs font-semibold uppercase tracking-wider">{label}</span>
    </div>
  );
}
