import { Suspense, lazy, useCallback, useState } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { AuthProvider } from './contexts/AuthContext';
import { AppWithAuth } from './AppWithAuth';

export default function App() {
  return (
    <AuthProvider>
      <AppWithAuth />
      <Analytics />
    </AuthProvider>
  );
}
