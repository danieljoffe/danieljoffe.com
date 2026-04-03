'use client';

import { CheckCircle, AlertTriangle, XCircle, Info, X } from 'lucide-react';
import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from 'react';

export type ToastVariant = 'info' | 'success' | 'warning' | 'error';

export interface ToastItem {
  id: string;
  variant: ToastVariant;
  title: string;
  description?: string;
}

export interface ToastContextType {
  toast: (params: Omit<ToastItem, 'id'>) => void;
}

const ToastContext = createContext<ToastContextType>({
  toast: () => undefined,
});

export function useToast() {
  return useContext(ToastContext);
}

const icons: Record<ToastVariant, typeof Info> = {
  info: Info,
  success: CheckCircle,
  warning: AlertTriangle,
  error: XCircle,
};

const iconColors: Record<ToastVariant, string> = {
  info: 'text-info',
  success: 'text-success',
  warning: 'text-warning',
  error: 'text-error',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback((params: Omit<ToastItem, 'id'>) => {
    const id = Math.random().toString(36).slice(2);
    setToasts(prev => [...prev, { ...params, id }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  const dismiss = (id: string) =>
    setToasts(prev => prev.filter(t => t.id !== id));

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      {children}
      <div className='fixed bottom-20 right-4 z-100 flex flex-col gap-2 max-w-sm'>
        {toasts.map(t => {
          const Icon = icons[t.variant];
          return (
            <div
              key={t.id}
              className='flex items-start gap-3 p-4 bg-surface-elevated border border-border rounded-lg shadow-lg animate-slide-up'
            >
              <Icon className={`h-5 w-5 shrink-0 ${iconColors[t.variant]}`} />
              <div className='flex-1 min-w-0'>
                <p className='text-sm font-medium text-text-primary'>
                  {t.title}
                </p>
                {t.description && (
                  <p className='text-xs text-text-secondary mt-0.5'>
                    {t.description}
                  </p>
                )}
              </div>
              <button
                onClick={() => dismiss(t.id)}
                className='p-0.5 text-text-tertiary hover:text-text-primary transition-colors cursor-pointer'
              >
                <X className='h-4 w-4' />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
