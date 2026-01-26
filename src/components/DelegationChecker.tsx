import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { Loader2, CheckCircle2, XCircle, RefreshCw, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface DelegationCheckerProps {
  dominio: string;
  nameserversEsperados: string[];
}

interface VerificationResult {
  status: string;
  delegado: boolean | null;
  puede_continuar: boolean;
  nameservers_actuales: string[] | null;
  mensaje: string;
  error?: string;
  verificacion_real?: boolean;
  warning?: string;
}

export default function DelegationChecker({ dominio, nameserversEsperados }: DelegationCheckerProps) {
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);

  const verificarDelegacion = async () => {
    setChecking(true);
    setResult(null);

    try {
      const response = await fetch("/api/verificar-delegacion", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ dominio }),
      });

      const data = await response.json();
      setResult(data);
      setLastCheck(new Date());
    } catch (error) {
      setResult({
        status: "error",
        delegado: false,
        puede_continuar: false,
        nameservers_actuales: null,
        mensaje: "Error al verificar delegación DNS",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setChecking(false);
    }
  };

  return (
    <Card className="glass p-4 sm:p-6 border-white/10">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold gradient-text">
            🔍 Verificación de Delegación DNS
          </h3>
          <motion.button
            onClick={verificarDelegacion}
            disabled={checking}
            className="glass glass-hover px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            whileHover={{ scale: checking ? 1 : 1.05 }}
            whileTap={{ scale: checking ? 1 : 0.95 }}
          >
            {checking ? (
              <>
                <Loader2 className="w-4 h-4 inline mr-2 animate-spin" />
                Verificando...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 inline mr-2" />
                Verificar Ahora
              </>
            )}
          </motion.button>
        </div>

        {/* Descripción */}
        <p className="text-sm text-gray-400">
          Verifica si tu dominio <strong className="text-white">{dominio}</strong> ya fue delegado correctamente a Cloudflare.
          Esto es necesario para que la protección funcione.
        </p>

        {/* Resultado */}
        <AnimatePresence mode="wait">
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {/* Estado principal */}
              {result.delegado === true && (
                <Alert className="border-l-4 border-green-400 bg-green-900/20">
                  <div className="flex items-start space-x-3">
                    <CheckCircle2 className="w-6 h-6 text-green-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-semibold text-green-200 mb-1">
                        ✅ Delegación Exitosa
                      </h4>
                      <p className="text-sm text-green-300">{result.mensaje}</p>
                      <Badge className="mt-2 bg-green-400/20 text-green-400 border-green-400">
                        Sistema puede continuar
                      </Badge>
                    </div>
                  </div>
                </Alert>
              )}

              {result.delegado === false && (
                <Alert className="border-l-4 border-yellow-400 bg-yellow-900/20">
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className="w-6 h-6 text-yellow-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-semibold text-yellow-200 mb-1">
                        ⏳ Delegación Pendiente
                      </h4>
                      <p className="text-sm text-yellow-300">{result.mensaje}</p>
                      <Badge className="mt-2 bg-yellow-400/20 text-yellow-400 border-yellow-400">
                        Acción requerida
                      </Badge>
                    </div>
                  </div>
                </Alert>
              )}

              {result.delegado === null && (
                <Alert className="border-l-4 border-orange-400 bg-orange-900/20">
                  <div className="flex items-start space-x-3">
                    <XCircle className="w-6 h-6 text-orange-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-semibold text-orange-200 mb-1">
                        ⚠️ No se pudo verificar
                      </h4>
                      <p className="text-sm text-orange-300">{result.mensaje}</p>
                      {result.error && (
                        <p className="text-xs text-orange-400 mt-1">Error: {result.error}</p>
                      )}
                    </div>
                  </div>
                </Alert>
              )}

              {/* Comparación de nameservers */}
              {result.nameservers_actuales && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Nameservers esperados */}
                  <div className="glass p-4 rounded-lg">
                    <h5 className="text-sm font-semibold text-cyan-400 mb-2">
                      📋 Nameservers Esperados (Cloudflare)
                    </h5>
                    <div className="space-y-1">
                      {nameserversEsperados.map((ns, idx) => (
                        <div
                          key={idx}
                          className="text-xs font-mono text-gray-300 bg-black/30 px-2 py-1 rounded"
                        >
                          {ns}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Nameservers actuales */}
                  <div className="glass p-4 rounded-lg">
                    <h5 className="text-sm font-semibold text-purple-400 mb-2">
                      🌐 Nameservers Actuales (Tu Dominio)
                    </h5>
                    <div className="space-y-1">
                      {result.nameservers_actuales.map((ns, idx) => {
                        const coincide = nameserversEsperados.some(
                          (expected) => expected.toLowerCase() === ns.toLowerCase()
                        );
                        return (
                          <div
                            key={idx}
                            className={`text-xs font-mono px-2 py-1 rounded flex items-center justify-between ${
                              coincide
                                ? "text-green-300 bg-green-900/30"
                                : "text-red-300 bg-red-900/30"
                            }`}
                          >
                            <span>{ns}</span>
                            {coincide ? (
                              <CheckCircle2 className="w-3 h-3 text-green-400" />
                            ) : (
                              <XCircle className="w-3 h-3 text-red-400" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Última verificación */}
              {lastCheck && (
                <div className="space-y-2">
                  <p className="text-xs text-gray-500 text-center">
                    Última verificación: {lastCheck.toLocaleString()}
                  </p>
                  
                  {/* Indicador de verificación real */}
                  {result.verificacion_real !== undefined && (
                    <div className="flex items-center justify-center gap-2">
                      {result.verificacion_real ? (
                        <Badge className="bg-blue-500/20 text-blue-400 border-blue-400 text-xs">
                          ✓ Verificación DNS Real (dnspython)
                        </Badge>
                      ) : (
                        <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-400 text-xs">
                          ⚠️ Verificación Alternativa
                        </Badge>
                      )}
                    </div>
                  )}
                  
                  {/* Warning si existe */}
                  {result.warning && (
                    <p className="text-xs text-yellow-400 text-center italic">
                      {result.warning}
                    </p>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mensaje inicial */}
        {!result && !checking && (
          <div className="text-center py-8 text-gray-500">
            <RefreshCw className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">
              Haz clic en "Verificar Ahora" para comprobar el estado de delegación DNS
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}
