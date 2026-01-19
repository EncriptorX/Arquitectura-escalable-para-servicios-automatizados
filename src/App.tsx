import { useState } from 'react';
import { Shield, Zap, Lock, Globe, Activity, CheckCircle, Cloud, ShieldCheck, Eye, Server, BarChart3, Clock } from 'lucide-react';
import ServiceRequestForm from './components/ServiceRequestForm';
import ProcessInfoPage from './components/ProcessInfoPage';

type ProcessInfo = {
  urls: string[];
  message: string;
  output?: string;
};

function App() {
  const [showForm, setShowForm] = useState(false);
  const [processInfo, setProcessInfo] = useState<ProcessInfo | null>(null);
  const [showProcessPage, setShowProcessPage] = useState(false);

  const handleSuccess = (payload: ProcessInfo) => {
    setProcessInfo(payload);
    setShowProcessPage(true);
    setShowForm(false);
  };

  const handleBackHome = () => {
    setShowProcessPage(false);
    setProcessInfo(null);
  };

  const handleNewRequest = () => {
    setShowProcessPage(false);
    setShowForm(true);
  };

  const features = [
    {
      icon: Shield,
      title: 'Protección DDoS Multicapa',
      description: 'Defensa contra ataques DDoS en las capas 3, 4 y 7 del modelo OSI',
    },
    {
      icon: Lock,
      title: 'Web Application Firewall',
      description: 'WAF avanzado que protege contra vulnerabilidades OWASP y ataques web',
    },
    {
      icon: Activity,
      title: 'Protección contra Bots',
      description: 'Filtrado inteligente de tráfico malicioso y bots automatizados',
    },
    {
      icon: Zap,
      title: 'CDN y Optimización',
      description: 'Red de distribución de contenido para máximo rendimiento',
    },
    {
      icon: Globe,
      title: 'Protección DNS',
      description: 'Seguridad completa a nivel de DNS contra ataques y manipulación',
    },
    {
      icon: Server,
      title: 'Reglas Personalizadas',
      description: 'Filtrado de tráfico y políticas de seguridad adaptadas a sus necesidades',
    },
    {
      icon: Eye,
      title: 'Monitoreo Continuo',
      description: 'Vigilancia 24/7 con detección y respuesta automática a amenazas',
    },
    {
      icon: BarChart3,
      title: 'Mitigación Automática',
      description: 'Respuesta instantánea ante incidentes de seguridad',
    },
  ];

  const benefits = [
    {
      icon: Clock,
      title: 'Protección 24/7',
      description: 'Seguridad continua sin interrupciones, día y noche',
    },
    {
      icon: ShieldCheck,
      title: 'Reducción de Riesgos',
      description: 'Minimice la exposición a ciberataques y vulnerabilidades',
    },
    {
      icon: Zap,
      title: 'Mayor Disponibilidad',
      description: 'Asegure el tiempo de actividad y rendimiento óptimo de su sitio',
    },
    {
      icon: Cloud,
      title: 'Seguridad Gestionada',
      description: 'Expertos en ciberseguridad administran su protección',
    },
  ];

  const steps = [
    {
      number: '01',
      title: 'Solicitud del Servicio',
      description: 'Complete el formulario con los datos de su empresa y las URLs a proteger',
    },
    {
      number: '02',
      title: 'Registro de URLs',
      description: 'Indique todos los sitios web y aplicaciones que desea proteger',
    },
    {
      number: '03',
      title: 'Configuración de Cloudflare',
      description: 'Nuestro equipo configura las políticas de seguridad perimetral',
    },
    {
      number: '04',
      title: 'Protección Activa',
      description: 'Su infraestructura queda protegida de forma integral e inmediata',
    },
  ];

  if (showProcessPage && processInfo) {
    return (
      <ProcessInfoPage
        urls={processInfo.urls}
        message={processInfo.message}
        output={processInfo.output}
        onBack={handleBackHome}
        onNewRequest={handleNewRequest}
      />
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {showForm && (
        <ServiceRequestForm
          onClose={() => setShowForm(false)}
          onSuccess={handleSuccess}
        />
      )}

      <header className="fixed w-full top-0 z-40 bg-black bg-opacity-90 backdrop-blur-sm border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="text-cyan-400" size={32} />
              <span className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                SecurePerimeter
              </span>
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition-all transform hover:scale-105"
            >
              Solicitar Protección
            </button>
          </div>
        </div>
      </header>

      <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-black to-cyan-900/20"></div>
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse delay-1000"></div>
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 bg-cyan-500 bg-opacity-10 border border-cyan-500 rounded-full px-4 py-2 mb-8">
              <Lock size={20} className="text-cyan-400" />
              <span className="text-cyan-400 font-medium">Protección Perimetral Cloudflare</span>
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
              <span className="bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                Proteja Su
              </span>
              <br />
              <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                Perímetro Digital
              </span>
            </h1>

            <p className="text-xl sm:text-2xl text-gray-300 mb-12 max-w-3xl mx-auto leading-relaxed">
              Protección integral para su infraestructura web con la tecnología líder de Cloudflare.
              Una solución completa contra todas las amenazas.
            </p>

            <button
              onClick={() => setShowForm(true)}
              className="group relative inline-flex items-center gap-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-bold text-lg py-4 px-8 rounded-lg transition-all transform hover:scale-105 shadow-2xl shadow-cyan-500/50"
            >
              <Shield size={24} />
              <span>Solicitar Protección Perimetral</span>
              <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </section>

      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-black to-gray-900">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold mb-6">
              <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                Servicio Integral de Protección Perimetral
              </span>
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
              Un servicio unificado y completo que incluye todas las capas de protección necesarias
              para mantener su infraestructura web segura, disponible y optimizada.
            </p>
          </div>

          <div className="bg-gray-800 bg-opacity-50 backdrop-blur-sm border border-gray-700 rounded-2xl p-8 sm:p-12 mb-12">
            <div className="flex items-start gap-4 mb-8">
              <div className="bg-gradient-to-br from-cyan-500 to-blue-600 p-3 rounded-lg">
                <Shield size={32} className="text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-bold mb-3 text-white">Protección Completa en un Solo Servicio</h3>
                <p className="text-gray-300 text-lg leading-relaxed">
                  No ofrecemos módulos separados ni planes fragmentados. Nuestro servicio de Protección Perimetral
                  es una solución integral que combina todas las tecnologías de seguridad de Cloudflare en un paquete
                  unificado y gestionado por especialistas.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className="bg-gray-900 border border-gray-700 rounded-xl p-6 hover:border-cyan-500 transition-all transform hover:scale-105 group"
                >
                  <feature.icon className="text-cyan-400 mb-4 group-hover:scale-110 transition-transform" size={32} />
                  <h4 className="text-lg font-bold mb-2 text-white">{feature.title}</h4>
                  <p className="text-gray-400 text-sm leading-relaxed">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 rounded-2xl p-8 text-center">
            <CheckCircle className="text-cyan-400 mx-auto mb-4" size={48} />
            <p className="text-xl text-gray-200 font-semibold">
              Todas estas características están incluidas en un único servicio integral.
              Sin sorpresas, sin complementos adicionales.
            </p>
          </div>
        </div>
      </section>

      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-900">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold mb-6">
              <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                Beneficios Clave
              </span>
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Ventajas tangibles que impactan directamente en su negocio
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {benefits.map((benefit, index) => (
              <div
                key={index}
                className="relative group"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity blur"></div>
                <div className="relative bg-gray-800 border border-gray-700 rounded-2xl p-8 hover:border-transparent transition-all">
                  <div className="bg-gradient-to-br from-cyan-500 to-blue-600 w-16 h-16 rounded-xl flex items-center justify-center mb-6">
                    <benefit.icon className="text-white" size={32} />
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-white">{benefit.title}</h3>
                  <p className="text-gray-400 leading-relaxed">{benefit.description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-gray-800 border border-gray-700 rounded-2xl p-8">
              <h3 className="text-2xl font-bold mb-4 text-white">Integración Transparente</h3>
              <p className="text-gray-300 leading-relaxed">
                La implementación no afecta el funcionamiento de su sitio. Los usuarios finales no
                notarán cambios, excepto por la mejora en velocidad y disponibilidad.
              </p>
            </div>
            <div className="bg-gray-800 border border-gray-700 rounded-2xl p-8">
              <h3 className="text-2xl font-bold mb-4 text-white">Sin Mantenimiento</h3>
              <p className="text-gray-300 leading-relaxed">
                Nuestro equipo de especialistas gestiona todas las actualizaciones, ajustes y
                optimizaciones. Usted se enfoca en su negocio mientras nosotros protegemos su perímetro.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-gray-900 to-black">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold mb-6">
              <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                ¿Cómo Funciona?
              </span>
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Proceso simple y rápido para activar su protección perimetral
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, index) => (
              <div key={index} className="relative">
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-16 left-full w-full h-0.5 bg-gradient-to-r from-cyan-500 to-transparent"></div>
                )}
                <div className="relative bg-gray-800 border border-gray-700 rounded-2xl p-8 hover:border-cyan-500 transition-all group">
                  <div className="absolute -top-6 left-8 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-xl w-12 h-12 rounded-full flex items-center justify-center border-4 border-black">
                    {step.number}
                  </div>
                  <div className="mt-4">
                    <h3 className="text-xl font-bold mb-3 text-white group-hover:text-cyan-400 transition-colors">
                      {step.title}
                    </h3>
                    <p className="text-gray-400 leading-relaxed">{step.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-16 text-center">
            <button
              onClick={() => setShowForm(true)}
              className="group inline-flex items-center gap-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-bold text-lg py-4 px-8 rounded-lg transition-all transform hover:scale-105 shadow-2xl shadow-cyan-500/50"
            >
              <span>Iniciar Ahora</span>
              <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </section>

      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-black">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold mb-6">
              <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                Confianza y Seguridad
              </span>
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Su tranquilidad es nuestra prioridad
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 rounded-2xl p-8 text-center hover:border-cyan-500 transition-all">
              <div className="bg-gradient-to-br from-cyan-500 to-blue-600 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <ShieldCheck className="text-white" size={40} />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-white">Tecnología Cloudflare</h3>
              <p className="text-gray-300 leading-relaxed">
                Respaldados por la infraestructura de seguridad más grande y confiable del mundo
              </p>
            </div>

            <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 rounded-2xl p-8 text-center hover:border-cyan-500 transition-all">
              <div className="bg-gradient-to-br from-cyan-500 to-blue-600 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Lock className="text-white" size={40} />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-white">Confidencialidad Total</h3>
              <p className="text-gray-300 leading-relaxed">
                Sus datos y configuraciones están protegidos con los más altos estándares de privacidad
              </p>
            </div>

            <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 rounded-2xl p-8 text-center hover:border-cyan-500 transition-all">
              <div className="bg-gradient-to-br from-cyan-500 to-blue-600 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Eye className="text-white" size={40} />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-white">Gestión Profesional</h3>
              <p className="text-gray-300 leading-relaxed">
                Expertos certificados en ciberseguridad administran su protección 24/7
              </p>
            </div>
          </div>

          <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 rounded-2xl p-12 text-center">
            <h3 className="text-3xl font-bold mb-4 text-white">
              Miles de Organizaciones Confían en Cloudflare
            </h3>
            <p className="text-xl text-gray-300 mb-8">
              Únase a empresas líderes que protegen su infraestructura digital con la mejor tecnología del mercado
            </p>
            <div className="flex flex-wrap justify-center gap-8 text-gray-400">
              <div className="text-center">
                <div className="text-4xl font-bold text-cyan-400 mb-2">99.99%</div>
                <div className="text-sm">Disponibilidad</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-cyan-400 mb-2">&lt;3ms</div>
                <div className="text-sm">Latencia Promedio</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-cyan-400 mb-2">182 Tbps</div>
                <div className="text-sm">Capacidad de Red</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="bg-gradient-to-b from-black to-gray-900 border-t border-gray-800 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <Shield className="text-cyan-400" size={32} />
                <span className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                  SecurePerimeter
                </span>
              </div>
              <p className="text-gray-400 leading-relaxed">
                Protección perimetral integral para su infraestructura digital,
                respaldada por la tecnología líder de Cloudflare.
              </p>
            </div>

            <div>
              <h4 className="text-lg font-bold mb-4 text-white">Contacto</h4>
              <div className="space-y-2 text-gray-400">
                <p>Email: contacto@secureperimeter.com</p>
                <p>Teléfono: +34 900 000 000</p>
                <p>Horario: Lunes a Viernes, 9:00 - 18:00</p>
              </div>
            </div>

            <div>
              <h4 className="text-lg font-bold mb-4 text-white">Legal</h4>
              <div className="space-y-2 text-gray-400">
                <p className="text-sm leading-relaxed">
                  Servicios de ciberseguridad profesional. Todos los datos son tratados
                  con confidencialidad y protegidos según la normativa vigente.
                </p>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8 text-center text-gray-500 text-sm">
            <p>© 2024 SecurePerimeter. Protección Perimetral Profesional. Todos los derechos reservados.</p>
            <p className="mt-2">Cloudflare® es una marca registrada de Cloudflare, Inc.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
