import { useState } from 'react';
import { Shield, Zap, Lock, Globe, Activity, CheckCircle, Cloud, ShieldCheck, Eye, Server, BarChart3, Clock, Sparkles, Settings } from 'lucide-react';
import { motion } from 'framer-motion';
import ServiceRequestForm from './components/ServiceRequestForm';
import ProcessInfoPage from './components/ProcessInfoPage';
import ControlPanelPage from './components/ControlPanelPage';
import CSaaSRequestForm from './components/CSaaSRequestForm';
import CSaaSResultPage from './components/CSaaSResultPage';
import CSaaSClientsPage from './components/CSaaSClientsPage';

type ProcessInfo = {
  urls: string[];
  message: string;
  output?: string;
};

type CSaaSInfo = {
  subdomain: string;
  protected_url: string;
  origin_urls: string[];
  message: string;
  logs?: string[];
};

type View = 'home' | 'form' | 'process' | 'control-panel' | 'csaas-form' | 'csaas-result' | 'csaas-clients';

function App() {
  const [currentView, setCurrentView] = useState<View>('home');
  const [processInfo, setProcessInfo] = useState<ProcessInfo | null>(null);
  const [csaasInfo, setCSaaSInfo] = useState<CSaaSInfo | null>(null);

  const handleSuccess = (payload: ProcessInfo) => {
    setProcessInfo(payload);
    setCurrentView('process');
  };

  const handleCSaaSSuccess = (payload: CSaaSInfo) => {
    setCSaaSInfo(payload);
    setCurrentView('csaas-result');
  };

  const handleBackHome = () => {
    setProcessInfo(null);
    setCSaaSInfo(null);
    setCurrentView('home');
  };

  const handleNewRequest = () => {
    setProcessInfo(null);
    setCurrentView('form');
  };

  const handleNewCSaaSRequest = () => {
    setCSaaSInfo(null);
    setCurrentView('csaas-form');
  };

  const handleOpenControlPanel = () => {
    setCurrentView('control-panel');
  };

  const features = [
    { icon: Shield, title: 'Protección DDoS', description: 'Defensa multicapa contra ataques DDoS' },
    { icon: Lock, title: 'WAF Avanzado', description: 'Firewall de aplicaciones web inteligente' },
    { icon: Activity, title: 'Anti-Bot', description: 'Filtrado de tráfico malicioso' },
    { icon: Zap, title: 'CDN Global', description: 'Optimización y distribución de contenido' },
    { icon: Globe, title: 'DNS Seguro', description: 'Protección a nivel de DNS' },
    { icon: Server, title: 'Reglas Custom', description: 'Políticas de seguridad personalizadas' },
    { icon: Eye, title: 'Monitoreo 24/7', description: 'Vigilancia continua de amenazas' },
    { icon: BarChart3, title: 'Auto-Mitigación', description: 'Respuesta automática a incidentes' },
  ];

  const benefits = [
    { icon: Clock, title: 'Protección 24/7', description: 'Seguridad continua sin interrupciones' },
    { icon: ShieldCheck, title: 'Reducción de Riesgos', description: 'Minimice la exposición a amenazas' },
    { icon: Zap, title: 'Alta Disponibilidad', description: 'Tiempo de actividad óptimo' },
    { icon: Cloud, title: 'Gestión Completa', description: 'Administración por expertos' },
  ];

  const steps = [
    { number: '01', title: 'Solicitud', description: 'Complete el formulario con sus datos' },
    { number: '02', title: 'Registro', description: 'Indique las URLs a proteger' },
    { number: '03', title: 'Configuración', description: 'Configuramos las políticas de seguridad' },
    { number: '04', title: 'Protección Activa', description: 'Su infraestructura queda protegida' },
  ];

  if (currentView === 'control-panel') {
    return (
      <ControlPanelPage 
        onBack={handleBackHome}
        onRequestProtection={() => setCurrentView('form')}
      />
    );
  }

  if (currentView === 'csaas-clients') {
    return (
      <CSaaSClientsPage
        onBack={handleBackHome}
      />
    );
  }

  if (currentView === 'csaas-result' && csaasInfo) {
    return (
      <CSaaSResultPage
        subdomain={csaasInfo.subdomain}
        protected_url={csaasInfo.protected_url}
        origin_urls={csaasInfo.origin_urls}
        message={csaasInfo.message}
        logs={csaasInfo.logs}
        onBack={handleBackHome}
        onNewRequest={handleNewCSaaSRequest}
      />
    );
  }

  if (currentView === 'process' && processInfo) {
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
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-black to-gray-900">
      {currentView === 'form' && (
        <ServiceRequestForm
          onClose={() => setCurrentView('home')}
          onSuccess={handleSuccess}
        />
      )}

      {currentView === 'csaas-form' && (
        <CSaaSRequestForm
          onClose={() => setCurrentView('home')}
          onSuccess={handleCSaaSSuccess}
        />
      )}

      {/* Header */}
      <motion.header 
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className="fixed w-full top-0 z-50 glass backdrop-blur-glass border-b border-white/10"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
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
                onClick={handleOpenControlPanel}
                className="glass glass-hover px-4 py-2.5 rounded-full font-medium text-sm group"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Settings className="inline-block mr-2 w-4 h-4 text-cyan-400" />
                <span className="gradient-text hidden sm:inline">Panel</span>
              </motion.button>
              
              <motion.button
                onClick={() => setCurrentView('csaas-clients')}
                className="glass glass-hover px-4 py-2.5 rounded-full font-medium text-sm group"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Server className="inline-block mr-2 w-4 h-4 text-purple-400" />
                <span className="gradient-text hidden sm:inline">Clientes</span>
              </motion.button>
              
              <motion.button
                onClick={() => setCurrentView('csaas-form')}
                className="glass glass-hover px-4 py-2.5 rounded-full font-medium text-sm group"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Globe className="inline-block mr-2 w-4 h-4 text-purple-400" />
                <span className="gradient-text hidden sm:inline">CSaaS</span>
              </motion.button>
              
              <motion.button
                onClick={() => setCurrentView('form')}
                className="glass glass-hover px-6 py-2.5 rounded-full font-medium text-sm hover-glow group"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <span className="gradient-text">Protección</span>
                <Sparkles className="inline-block ml-2 w-4 h-4 text-cyan-400 group-hover:rotate-12 transition-transform" />
              </motion.button>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0">
          <motion.div
            className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{ duration: 8, repeat: Infinity }}
          />
          <motion.div
            className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl"
            animate={{
              scale: [1.2, 1, 1.2],
              opacity: [0.5, 0.3, 0.5],
            }}
            transition={{ duration: 8, repeat: Infinity, delay: 1 }}
          />
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 glass px-4 py-2 rounded-full"
            >
              <Lock className="w-4 h-4 text-cyan-400" />
              <span className="text-sm text-gray-300">Protección Perimetral Cloudflare</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-tight"
            >
              <span className="text-white">Proteja Su</span>
              <br />
              <span className="gradient-text">Perímetro Digital</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-xl text-gray-400 max-w-2xl mx-auto"
            >
              Protección integral con tecnología Cloudflare. Seguridad empresarial simplificada.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              <motion.button
                onClick={() => setCurrentView('csaas-form')}
                className="group relative inline-flex items-center gap-3 bg-gradient-to-r from-purple-500 to-pink-600 px-8 py-4 rounded-full font-semibold text-lg hover-glow"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Globe className="w-5 h-5" />
                <span>Protección CSaaS</span>
                <motion.svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  animate={{ x: [0, 5, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </motion.svg>
              </motion.button>
              
              <motion.button
                onClick={() => setCurrentView('form')}
                className="group relative inline-flex items-center gap-3 bg-gradient-to-r from-cyan-500 to-blue-600 px-8 py-4 rounded-full font-semibold text-lg hover-glow"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Shield className="w-5 h-5" />
                <span>Protección Directa</span>
                <motion.svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  animate={{ x: [0, 5, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </motion.svg>
              </motion.button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold mb-4">
              <span className="gradient-text">Dos Modos de Protección</span>
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Elija el modo que mejor se adapte a sus necesidades
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
            {/* CSaaS Mode */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="glass glass-hover p-8 rounded-2xl border-2 border-purple-500/30"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-gradient-to-br from-purple-500 to-pink-600 w-12 h-12 rounded-xl flex items-center justify-center">
                  <Globe className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-white">Protección CSaaS</h3>
              </div>
              <p className="text-gray-300 mb-6">
                Sistema automático que genera un subdominio único bajo <strong className="text-purple-400">suncarsrl.com</strong> para proteger sus URLs sin modificar su DNS.
              </p>
              <ul className="space-y-3 mb-6">
                {[
                  'Subdominio automático generado',
                  'Sin cambios en su DNS',
                  'SSL/TLS automático',
                  'Protección inmediata',
                  'Ideal para SaaS providers'
                ].map((item, index) => (
                  <li key={index} className="flex items-center gap-2 text-sm text-gray-300">
                    <CheckCircle className="w-4 h-4 text-purple-400 flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <motion.button
                onClick={() => setCurrentView('csaas-form')}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white font-semibold py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Globe className="w-5 h-5" />
                <span>Usar CSaaS</span>
              </motion.button>
            </motion.div>

            {/* Direct Mode */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="glass glass-hover p-8 rounded-2xl border-2 border-cyan-500/30"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-gradient-to-br from-cyan-500 to-blue-600 w-12 h-12 rounded-xl flex items-center justify-center">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-white">Protección Directa</h3>
              </div>
              <p className="text-gray-300 mb-6">
                Protección tradicional que aplica configuraciones de seguridad directamente a sus dominios existentes en Cloudflare.
              </p>
              <ul className="space-y-3 mb-6">
                {[
                  'Usa sus dominios existentes',
                  'Requiere delegación DNS',
                  'Control total de DNS',
                  'Configuración avanzada',
                  'Ideal para infraestructura propia'
                ].map((item, index) => (
                  <li key={index} className="flex items-center gap-2 text-sm text-gray-300">
                    <CheckCircle className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <motion.button
                onClick={() => setCurrentView('form')}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Shield className="w-5 h-5" />
                <span>Usar Protección Directa</span>
              </motion.button>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold mb-4">
              <span className="gradient-text">Protección Integral</span>
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Todas las capas de seguridad en un solo servicio
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -5 }}
                className="glass glass-hover p-6 rounded-2xl group cursor-pointer"
              >
                <div className="bg-gradient-to-br from-cyan-500/20 to-blue-600/20 w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <feature.icon className="w-6 h-6 text-cyan-400" />
                </div>
                <h3 className="text-lg font-semibold mb-2 text-white">{feature.title}</h3>
                <p className="text-sm text-gray-400">{feature.description}</p>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-12 glass p-8 rounded-2xl text-center"
          >
            <CheckCircle className="w-12 h-12 text-cyan-400 mx-auto mb-4" />
            <p className="text-lg text-gray-300">
              Todas estas características incluidas. Sin costos adicionales.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-transparent to-black/50">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold mb-4">
              <span className="gradient-text">Beneficios Clave</span>
            </h2>
            <p className="text-gray-400 text-lg">Impacto directo en su negocio</p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {benefits.map((benefit, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="relative group"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-blue-600/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative glass glass-hover p-8 rounded-2xl">
                  <div className="bg-gradient-to-br from-cyan-500 to-blue-600 w-14 h-14 rounded-xl flex items-center justify-center mb-6">
                    <benefit.icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-white">{benefit.title}</h3>
                  <p className="text-gray-400">{benefit.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Steps Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold mb-4">
              <span className="gradient-text">¿Cómo Funciona?</span>
            </h2>
            <p className="text-gray-400 text-lg">Proceso simple en 4 pasos</p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="relative"
              >
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-12 left-full w-full h-px bg-gradient-to-r from-cyan-500/50 to-transparent" />
                )}
                <motion.div
                  whileHover={{ y: -5 }}
                  className="glass glass-hover p-6 rounded-2xl"
                >
                  <div className="bg-gradient-to-r from-cyan-500 to-blue-600 w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg mb-4">
                    {step.number}
                  </div>
                  <h3 className="text-lg font-bold mb-2 text-white">{step.title}</h3>
                  <p className="text-sm text-gray-400">{step.description}</p>
                </motion.div>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-12 text-center"
          >
            <motion.button
              onClick={() => setCurrentView('form')}
              className="glass glass-hover px-8 py-4 rounded-full font-semibold hover-glow"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <span className="gradient-text">Iniciar Ahora</span>
            </motion.button>
          </motion.div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-black/50 to-transparent">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold mb-4">
              <span className="gradient-text">Confianza y Seguridad</span>
            </h2>
            <p className="text-gray-400 text-lg">Respaldados por la mejor tecnología</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            {[
              { icon: ShieldCheck, title: 'Tecnología Cloudflare', desc: 'Infraestructura líder mundial' },
              { icon: Lock, title: 'Confidencialidad Total', desc: 'Máximos estándares de privacidad' },
              { icon: Eye, title: 'Gestión Profesional', desc: 'Expertos certificados 24/7' },
            ].map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -5 }}
                className="glass glass-hover p-8 rounded-2xl text-center"
              >
                <div className="bg-gradient-to-br from-cyan-500 to-blue-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                  <item.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-white">{item.title}</h3>
                <p className="text-gray-400">{item.desc}</p>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="glass p-12 rounded-2xl text-center"
          >
            <h3 className="text-2xl font-bold mb-6 text-white">
              Miles de Organizaciones Confían en Cloudflare
            </h3>
            <div className="flex flex-wrap justify-center gap-12">
              {[
                { value: '99.99%', label: 'Disponibilidad' },
                { value: '<3ms', label: 'Latencia' },
                { value: '182 Tbps', label: 'Capacidad' },
              ].map((stat, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.5 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="text-center"
                >
                  <div className="text-4xl font-bold gradient-text mb-2">{stat.value}</div>
                  <div className="text-sm text-gray-400">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <Shield className="text-cyan-400 w-6 h-6" />
                <span className="text-lg font-bold gradient-text">SecurePerimeter</span>
              </div>
              <p className="text-gray-400 text-sm">
                Protección perimetral integral respaldada por Cloudflare
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-4 text-white">Contacto</h4>
              <div className="space-y-2 text-sm text-gray-400">
                <p>kevinf@estudiantes.uci.cu</p>
                <p>+53 5695 42 00</p>
                <p>Lun-Vie, 9:00 - 18:00</p>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-4 text-white">Legal</h4>
              <p className="text-sm text-gray-400">
                Servicios profesionales de ciberseguridad
              </p>
            </div>
          </div>

          <div className="border-t border-white/10 pt-8 text-center text-sm text-gray-500">
            <p>© 2026 SecurePerimeter. Todos los derechos reservados.</p>
            <p className="mt-2">Cloudflare® es una marca registrada de Cloudflare, Inc.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
