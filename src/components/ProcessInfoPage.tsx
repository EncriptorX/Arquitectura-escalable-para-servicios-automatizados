import { ShieldCheck, ArrowLeft, Repeat, Info } from 'lucide-react';

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
  return (
    <div className="min-h-screen bg-black text-white">
      <header className="fixed w-full top-0 z-40 bg-black bg-opacity-90 backdrop-blur-sm border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldCheck className="text-cyan-400" size={32} />
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
      </header>

      <main className="pt-28 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto space-y-10">
          <section className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
            <div className="flex items-start gap-4">
              <div className="bg-gradient-to-br from-cyan-500 to-blue-600 w-14 h-14 rounded-xl flex items-center justify-center">
                <ShieldCheck className="text-white" size={28} />
              </div>
              <div className="flex-1">
                <p className="text-sm uppercase tracking-wide text-cyan-400 font-semibold mb-2">
                  Proceso iniciado
                </p>
                <h1 className="text-3xl font-bold text-white mb-3">
                  Estamos configurando tu protección perimetral
                </h1>
                <p className="text-gray-300 leading-relaxed">
                  {message || 'La solicitud fue recibida y el script de protección está en ejecución.'}
                  {' '}
                  Te avisaremos si ocurre algún problema con la provisión automática en Cloudflare.
                </p>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-2xl p-8">
              <h2 className="text-2xl font-semibold text-white mb-4">URLs enviadas al script</h2>
              <p className="text-gray-400 mb-4">
                Estas direcciones fueron pasadas a <code className="text-cyan-400">cloudflare_protect.py</code> para su aprovisionamiento.
              </p>
              <div className="bg-black border border-gray-800 rounded-xl divide-y divide-gray-800">
                {urls.map((url, idx) => (
                  <div key={url + idx} className="px-4 py-3 flex items-center justify-between">
                    <span className="text-gray-100">{url}</span>
                    <span className="text-xs text-gray-400">En proceso</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
              <h3 className="text-xl font-semibold text-white mb-3 flex items-center gap-2">
                <Info size={18} className="text-cyan-400" />
                ¿Qué sucede ahora?
              </h3>
              <ul className="space-y-3 text-gray-300">
                <li>1. El script valida dominios y aplica reglas de seguridad.</li>
                <li>2. Se configuran registros DNS con proxy activo.</li>
                <li>3. Se ajustan SSL/TLS, WAF y reglas de firewall.</li>
                <li>4. Te contactaremos si se necesita confirmar delegación DNS.</li>
              </ul>
            </div>
          </section>

          {output && (
            <section className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
              <h2 className="text-2xl font-semibold text-white mb-4">Salida técnica del proceso</h2>
              <p className="text-gray-400 mb-3">
                Útil para validar el estado del aprovisionamiento o compartir con el equipo técnico.
              </p>
              <div className="bg-black border border-gray-800 rounded-xl p-4 overflow-x-auto text-sm text-gray-200 font-mono">
                {output}
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
