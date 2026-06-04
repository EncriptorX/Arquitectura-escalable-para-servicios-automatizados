/**
 * AppWithAuth
 * Lee la sesión de Supabase desde el AuthContext.
 * Si hay sesión activa → muestra el dashboard del rol.
 * Si no hay sesión → muestra el login.
 * La sesión persiste en localStorage — no se pierde al recargar.
 */

import { Suspense, lazy, useCallback, useState } from 'react';
import LoginPage from './components/LoginPage';
import { RoleDashboard } from './components/Dashboard/RoleDashboard';
import { useAuth } from './contexts/AuthContext';
import type { CSaaSInfo, ProcessInfo, View } from './types/app';

const ServiceRequestForm = lazy(() => import('./components/ServiceRequestForm'));
const ProcessInfoPage    = lazy(() => import('./components/ProcessInfoPage'));
const ControlPanelPage   = lazy(() => import('./components/ControlPanelPage'));
const CSaaSRequestForm   = lazy(() => import('./components/CSaaSRequestForm'));
const CSaaSResultPage    = lazy(() => import('./components/CSaaSResultPage'));
const CSaaSClientsPage   = lazy(() => import('./components/CSaaSClientsPage'));

export function AppWithAuth() {
  const { user, loading } = useAuth();
  const [currentView, setCurrentView] = useState<View>('home');
  const [processInfo, setProcessInfo]  = useState<ProcessInfo | null>(null);
  const [csaasInfo,   setCSaaSInfo]    = useState<CSaaSInfo | null>(null);

  const handleSuccess = useCallback((payload: ProcessInfo) => {
    setProcessInfo(payload);
    setCurrentView('process');
  }, []);

  const handleCSaaSSuccess = useCallback((payload: CSaaSInfo) => {
    setCSaaSInfo(payload);
    setCurrentView('csaas-result');
  }, []);

  const handleBackHome = useCallback(() => {
    setProcessInfo(null);
    setCSaaSInfo(null);
    setCurrentView('home');
  }, []);

  const handleNewRequest = useCallback(() => {
    setProcessInfo(null);
    setCurrentView('form');
  }, []);

  const handleNewCSaaSRequest = useCallback(() => {
    setCSaaSInfo(null);
    setCurrentView('csaas-form');
  }, []);

  const handleOpenControlPanel = useCallback(() => setCurrentView('control-panel'), []);
  const handleOpenClients      = useCallback(() => setCurrentView('csaas-clients'),  []);
  const handleOpenCSaaSForm    = useCallback(() => setCurrentView('csaas-form'),     []);
  const handleOpenDirectForm   = useCallback(() => setCurrentView('form'),           []);

  // Mientras Supabase verifica la sesión en localStorage
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">Verificando sesión...</p>
        </div>
      </div>
    );
  }

  // Sin sesión → Login
  if (!user) {
    return <LoginPage onLoginSuccess={() => {}} />;
  }

  // Con sesión → Dashboard según rol
  return (
    <RoleDashboard />
  );
}
