import { useCallback, useState } from 'react';
import ServiceRequestForm from './components/ServiceRequestForm';
import ProcessInfoPage from './components/ProcessInfoPage';
import ControlPanelPage from './components/ControlPanelPage';
import CSaaSRequestForm from './components/CSaaSRequestForm';
import CSaaSResultPage from './components/CSaaSResultPage';
import CSaaSClientsPage from './components/CSaaSClientsPage';
import HomePage from './components/HomePage';
import type { CSaaSInfo, ProcessInfo, View } from './types/app';

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
    <>
      {currentView === 'form' && (
        <ServiceRequestForm
          onClose={handleBackHome}
          onSuccess={handleSuccess}
        />
      )}

      {currentView === 'csaas-form' && (
        <CSaaSRequestForm
          onClose={handleBackHome}
          onSuccess={handleCSaaSSuccess}
        />
      )}

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
