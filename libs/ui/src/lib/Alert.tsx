import { AlertCircle, AlertTriangle, CheckCircle, Info, X } from 'lucide-react';
import type { ReactNode } from 'react';

type AlertVariant = 'info' | 'success' | 'warning' | 'error';

export interface AlertProps {
  children: ReactNode;
  variant?: AlertVariant;
  title?: string;
  dismissible?: boolean;
  onDismiss?: () => void;
  className?: string;
}

const variantStyles: Record<
  AlertVariant,
  { container: string; icon: typeof Info }
> = {
  info: {
    container: 'bg-info-muted border-info/30 text-info',
    icon: Info,
  },
  success: {
    container: 'bg-success-muted border-success/30 text-success',
    icon: CheckCircle,
  },
  warning: {
    container: 'bg-warning-muted border-warning/30 text-warning',
    icon: AlertTriangle,
  },
  error: {
    container: 'bg-error-muted border-error/30 text-error',
    icon: AlertCircle,
  },
};

export function Alert({
  children,
  variant = 'info',
  title,
  dismissible = false,
  onDismiss,
  className = '',
}: AlertProps) {
  const { container, icon: Icon } = variantStyles[variant];
  const isUrgent = variant === 'error' || variant === 'warning';

  return (
    <div
      role={isUrgent ? 'alert' : 'status'}
      aria-live={isUrgent ? 'assertive' : 'polite'}
      className={`relative rounded-lg border p-4 ${container} ${className}`}
    >
      <div className='flex gap-3'>
        <Icon className='w-5 h-5 flex-shrink-0 mt-0.5' aria-hidden='true' />
        <div className='flex-1'>
          {title && <h5 className='mb-1 mt-0'>{title}</h5>}
          <div className='text-sm text-foreground-muted'>{children}</div>
        </div>
        {dismissible && (
          <button
            onClick={onDismiss}
            aria-label='Dismiss alert'
            className='text-foreground-subtle hover:text-foreground transition-colors'
          >
            <X className='w-4 h-4' aria-hidden='true' />
          </button>
        )}
      </div>
    </div>
  );
}
