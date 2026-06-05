/**
 * AppWithAuth — Flujo principal de la aplicación
 *
 * Flujo:
 * 1. Sin sesión          → HomePage (landing con servicios) + botón Login
 * 2. Con sesión + org    → Dashboard según rol (admin/coordinator/analyst/viewer)
 * 3. Con sesión + sin org → OnboardingPage (crear organización)
 * 4. Loading             → Spinner mientras Supabase verifica sesión
 */

import { Suspense, lazy, useCallback, useState } from 'react';
import { useAuth } from './contexts/AuthContext';
import { RoleDashboard } from './components/Dashboard/RoleDashboard';
import { OnboardingPage } from './components/OnboardingPage';
import LoginPage from './components/LoginPage';
import HomePage from './components/HomePage';
import type { CSaaSInfo, ProcessInfo, View } from './types/app';

const ServiceRequestForm = lazy(() => import('./components/ServiceRequestForm'));
const ProcessInfoPage    = lazy(() => import('./components/ProcessInfoPage'));
const ControlPanelPage   = lazy(() => import('./components/ControlPanelPage'));
const CSaaSRequestForm   = lazy(() => import('./components/CSaaSRequestForm'));
const CSaaSResultPage    = lazy(() => import('./components/CSaaSResultPage'));
const CSaaSClientsPage   = lazy(() => import('./components/CSaaSClientsPage'));

export function AppWithAuth() {
  const { user, membership, loading } = useAuth();
  const [showLogin, setShowLogin]      = useState(false);
  const [currentView, setCurrentView]  = useState<View>('home');
  const [processInfo, setProcessInfo]  = useState<ProcessInfo | null>(null);
  const [csaasInfo,   setCSaaSInfo]    = useState<CSaaSInfo | null>(null);

  const handleSuccess = useCallback((payload: ProcessInfo) => {
    setProcessInfo(payload); setCurrentView('process');
  }, []);
  const handleCSaaSSuccess = useCallback((payload: CSaaSInfo) => {
    setCSaaSInfo(payload); setCurrentView('csaas-result');
  }, []);
  const handleBackHome = useCallback(() => {
    setProcessInfo(null); setCSaaSInfo(null); setCurrentView('home');
  }, []);
  const handleNewRequest      = useCallback(() => { setProcessInfo(null); setCurrentView('form'); }, []);
  const handleNewCSaaSRequest = useCallback(() => { setCSaaSInfo(null);   setCurrentView('csaas-form'); }, []);
  const handleOpenControlPanel = useCallback(() => setCurrentView('control-panel'), []);
  const handleOpenClients      = useCallback(() => setCurrentView('csaas-clients'),  []);
  const handleOpenCSaaSForm    = useCallback(() => setCurrentView('csaas-form'),     []);
  const handleOpenDirectForm   = useCallback(() => setCurrentView('form'),           []);

  // ── 1. Loading inicial ────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">Cargando...</p>
        </div>
      </div>
    );
  }

  // ── 2. Con sesión + organización → Dashboard del rol ─────────────────────
  if (user && membership) {
    return <RoleDashboard />;
  }

  // ── 3. Con sesión pero sin organización → Onboarding ─────────────────────
  if (user && !membership) {
    return <OnboardingPage />;
  }

  // ── 4. Sin sesión → mostrar login si el usuario lo pidió ──────────────────
  if (showLogin) {
    return <LoginPage onLoginSuccess={() => setShowLogin(false)} />;
  }

  // ── 5. Sin sesión → HomePage pública ─────────────────────────────────────
  // Vistas secundarias del landing
  if (currentView === 'control-panel') {
    return (
      <Suspense fallback={null}>
        <ControlPanelPage onBack={handleBackHome} onRequestProtection={() => setCurrentView('form')} />
      </Suspense>
    );
  }
  if (currentView === 'csaas-clients') {
    return <Suspense fallback={null}><CSaaSClientsPage onBack={handleBackHome} /></Suspense>;
  }
  if (currentView === 'csaas-result' && csaasInfo) {
    return (
      <Suspense fallback={null}>
        <CSaaSResultPage
          subdomain={csaasInfo.subdomain} protected_url={csaasInfo.protected_url}
          origin_urls={csaasInfo.origin_urls} message={csaasInfo.message}
          logs={csaasInfo.logs} onBack={handleBackHome} onNewRequest={handleNewCSaaSRequest}
        />
      </Suspense>
    );
  }
  if (currentView === 'process' && processInfo) {
    return (
      <Suspense fallback={null}>
        <ProcessInfoPage
          urls={processInfo.urls} message={processInfo.message}
          output={processInfo.output} onBack={handleBackHome} onNewRequest={handleNewRequest}
        />
      </Suspense>
    );
  }

  // HomePage con botón de Login en el header
  return (
    <>
      <Suspense fallback={null}>
        {currentView === 'form' && (
          <ServiceRequestForm onClose={handleBackHome} onSuccess={handleSuccess} />
        )}
        {currentView === 'csaas-form' && (
          <CSaaSRequestForm onClose={handleBackHome} onSuccess={handleCSaaSSuccess} />
        )}
      </Suspense>

      <HomePage
        onOpenControlPanel={handleOpenControlPanel}
        onOpenClients={handleOpenClients}
        onOpenCSaaSForm={handleOpenCSaaSForm}
        onOpenDirectForm={handleOpenDirectForm}
        onOpenLogin={() => setShowLogin(true)}
      />
    </>
  );
}
