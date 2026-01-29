import { Suspense, lazy, useCallback, useState } from 'react';
import HomePage from './components/HomePage';
import type { CSaaSInfo, ProcessInfo, View } from './types/app';

const ServiceRequestForm = lazy(() => import('./components/ServiceRequestForm'));
const ProcessInfoPage = lazy(() => import('./components/ProcessInfoPage'));
const ControlPanelPage = lazy(() => import('./components/ControlPanelPage'));
const CSaaSRequestForm = lazy(() => import('./components/CSaaSRequestForm'));
const CSaaSResultPage = lazy(() => import('./components/CSaaSResultPage'));
const CSaaSClientsPage = lazy(() => import('./components/CSaaSClientsPage'));

function App() {
  const [currentView, setCurrentView] = useState<View>('home');
  const [processInfo, setProcessInfo] = useState<ProcessInfo | null>(null);
  const [csaasInfo, setCSaaSInfo] = useState<CSaaSInfo | null>(null);

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
  const handleOpenClients = useCallback(() => setCurrentView('csaas-clients'), []);
  const handleOpenCSaaSForm = useCallback(() => setCurrentView('csaas-form'), []);
  const handleOpenDirectForm = useCallback(() => setCurrentView('form'), []);

  if (currentView === 'control-panel') {
    return (
      <Suspense fallback={null}>
        <ControlPanelPage
          onBack={handleBackHome}
          onRequestProtection={() => setCurrentView('form')}
        />
      </Suspense>
    );
  }

  if (currentView === 'csaas-clients') {
    return (
      <Suspense fallback={null}>
        <CSaaSClientsPage onBack={handleBackHome} />
      </Suspense>
    );
  }

  if (currentView === 'csaas-result' && csaasInfo) {
    return (
      <Suspense fallback={null}>
        <CSaaSResultPage
          subdomain={csaasInfo.subdomain}
          protected_url={csaasInfo.protected_url}
          origin_urls={csaasInfo.origin_urls}
          message={csaasInfo.message}
          logs={csaasInfo.logs}
          onBack={handleBackHome}
          onNewRequest={handleNewCSaaSRequest}
        />
      </Suspense>
    );
  }

  if (currentView === 'process' && processInfo) {
    return (
      <Suspense fallback={null}>
        <ProcessInfoPage
          urls={processInfo.urls}
          message={processInfo.message}
          output={processInfo.output}
          onBack={handleBackHome}
          onNewRequest={handleNewRequest}
        />
      </Suspense>
    );
  }

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

      {(currentView === 'home' || currentView === 'form' || currentView === 'csaas-form') && (
        <HomePage
          onOpenControlPanel={handleOpenControlPanel}
          onOpenClients={handleOpenClients}
          onOpenCSaaSForm={handleOpenCSaaSForm}
          onOpenDirectForm={handleOpenDirectForm}
        />
      )}
    </>
  );
}

export default App;
