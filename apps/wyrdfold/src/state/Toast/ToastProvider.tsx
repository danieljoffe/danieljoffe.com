'use client';

import { CheckCircle, AlertTriangle, XCircle, Info, X } from 'lucide-react';
import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from 'react';
import {
  DISMISS_BUTTON,
  FOCUS_RING,
  FOCUS_RING_OFFSET,
} from '@danieljoffe.com/shared-ui/styles/formStyles';
import type { SemanticVariant } from '@danieljoffe.com/shared-ui/styles/semanticVariants';
import { SEMANTIC_TEXT } from '@danieljoffe.com/shared-ui/styles/semanticVariants';
import { Text } from '@danieljoffe.com/shared-ui/Text';

type ToastVariant = SemanticVariant;

interface ToastItem {
  id: string;
  variant: ToastVariant;
  title: string;
  description?: string;
}

interface ToastContextType {
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

const iconColors = SEMANTIC_TEXT;

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
      {/*
        Container is the ARIA live region: ``aria-live="polite"`` queues
        announcements after the user's current speech, and ``role="status"``
        marks the region semantically. Without this, toasted errors were
        invisible to screen readers — the visual feedback was the only signal.
      */}
      <div
        role='status'
        aria-live='polite'
        aria-atomic='false'
        className='fixed bottom-20 right-4 z-100 flex flex-col gap-2 max-w-sm'
      >
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
                  <Text variant='detail' className='mt-0.5'>
                    {t.description}
                  </Text>
                )}
              </div>
              <button
                onClick={() => dismiss(t.id)}
                className={`p-0.5 ${DISMISS_BUTTON} cursor-pointer rounded-sm ${FOCUS_RING} ${FOCUS_RING_OFFSET}`}
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
