import { useState, useCallback } from 'react';

interface ToastOptions {
  title: string;
  description?: string;
  duration?: number;
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastOptions[]>([]);

  const toast = useCallback((options: ToastOptions) => {
    setToasts((prev) => [...prev, options]);
    
    setTimeout(() => {
      setToasts((prev) => prev.slice(1));
    }, options.duration || 3000);
  }, []);

  return { toast, toasts };
}
