'use client';

import { CheckCircle, AlertTriangle, XCircle, Info, X } from 'lucide-react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Heading } from './Heading';
import { Text } from './Text';
import { cn } from './utils/cn';

export type ToastVariant = 'info' | 'success' | 'warning' | 'error';

export interface ToastItem {
  id: string;
  variant: ToastVariant;
  title: string;
  description?: string;
  duration?: number;
}

export interface ToastContextType {
  toast: (params: Omit<ToastItem, 'id'>) => void;
}

const ToastContext = createContext<ToastContextType>({ toast: () => {} });

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

const DEFAULT_DISMISS_MS = 4000;
let toastCounter = 0;

function ToastCard({
  toast: t,
  onDismiss,
}: {
  toast: ToastItem;
  onDismiss: (id: string) => void;
}) {
  const duration = t.duration ?? DEFAULT_DISMISS_MS;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const remainingRef = useRef(duration);
  const startRef = useRef(Date.now());

  const isUrgent = t.variant === 'error' || t.variant === 'warning';
  const Icon = icons[t.variant];

  const startTimer = useCallback(() => {
    startRef.current = Date.now();
    timerRef.current = setTimeout(() => {
      onDismiss(t.id);
    }, remainingRef.current);
  }, [onDismiss, t.id]);

  const pauseTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
      remainingRef.current -= Date.now() - startRef.current;
    }
  }, []);

  useEffect(() => {
    startTimer();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [startTimer]);

  return (
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions -- hover/focus pause timer, not user interaction
    <div
      role={isUrgent ? 'alert' : 'status'}
      aria-atomic='true'
      onMouseEnter={pauseTimer}
      onMouseLeave={startTimer}
      onFocus={pauseTimer}
      onBlur={startTimer}
      className={cn(
        'flex items-start gap-3 p-4 bg-surface-elevated border border-border',
        'rounded-lg shadow-lg animate-slide-up'
      )}
    >
      <Icon className={cn('h-5 w-5 shrink-0', iconColors[t.variant])} />
      <div className='flex-1 min-w-0'>
        <Heading variant='cardTitle' as='p'>
          {t.title}
        </Heading>
        {t.description && (
          <Text variant='meta' className='mt-0.5'>
            {t.description}
          </Text>
        )}
      </div>
      <button
        onClick={() => onDismiss(t.id)}
        aria-label='Dismiss notification'
        className='p-0.5 text-text-tertiary hover:text-text-primary transition-colors cursor-pointer'
      >
        <X className='h-4 w-4' />
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback((params: Omit<ToastItem, 'id'>) => {
    const id = `toast-${++toastCounter}`;
    setToasts(prev => [...prev, { ...params, id }]);
  }, []);

  const dismiss = useCallback(
    (id: string) => setToasts(prev => prev.filter(t => t.id !== id)),
    []
  );

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      {children}
      <div
        aria-live='polite'
        aria-atomic='true'
        className='fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm'
      >
        {toasts.map(t => (
          <ToastCard key={t.id} toast={t} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}
