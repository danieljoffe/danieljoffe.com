import { AlertCircle, AlertTriangle, CheckCircle, Info, X } from 'lucide-react';
import { forwardRef, type ReactNode, type HTMLAttributes } from 'react';
import { cn } from './utils';

type AlertVariant = 'info' | 'success' | 'warning' | 'error';

export interface AlertProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'children' | 'className' | 'role'
> {
  children: ReactNode;
  variant?: AlertVariant;
  title?: string | undefined;
  dismissible?: boolean;
  onDismiss?: () => void;
  className?: string;
}

const variantStyles: Record<
  AlertVariant,
  { container: string; icon: typeof Info }
> = {
  info: {
    container: 'bg-info-light border-info/30 text-info',
    icon: Info,
  },
  success: {
    container: 'bg-success-light border-success/30 text-success',
    icon: CheckCircle,
  },
  warning: {
    container: 'bg-warning-light border-warning/30 text-warning',
    icon: AlertTriangle,
  },
  error: {
    container: 'bg-error-light border-error/30 text-error',
    icon: AlertCircle,
  },
};

export const Alert = forwardRef<HTMLDivElement, AlertProps>(
  (
    {
      children,
      variant = 'info',
      title,
      dismissible = false,
      onDismiss,
      className,
      ...props
    },
    ref
  ) => {
    const { container, icon: Icon } = variantStyles[variant];
    const isUrgent = variant === 'error' || variant === 'warning';

    return (
      <div
        ref={ref}
        role={isUrgent ? 'alert' : 'status'}
        aria-live={isUrgent ? 'assertive' : 'polite'}
        className={cn('relative rounded-lg border p-4', container, className)}
        {...props}
      >
        <div className='flex gap-3'>
          <Icon className='size-5 shrink-0 mt-0.5' aria-hidden='true' />
          <div className='flex-1'>
            {title && <h5 className='mb-1 mt-0'>{title}</h5>}
            <div className='text-sm text-text-secondary'>{children}</div>
          </div>
          {dismissible && (
            <button
              onClick={onDismiss}
              aria-label='Dismiss alert'
              className='text-text-tertiary hover:text-text-primary transition-colors'
            >
              <X className='size-4' aria-hidden='true' />
            </button>
          )}
        </div>
      </div>
    );
  }
);
Alert.displayName = 'Alert';
