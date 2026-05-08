import { useState, useCallback } from 'react';

export interface Toast { id: number; msg: string; type: 'success' | 'error'; }

let _toastId = 0;

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((msg: string, type: 'success' | 'error') => {
    const id = ++_toastId;
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  return { toasts, toast };
}
