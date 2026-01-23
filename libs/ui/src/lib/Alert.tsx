import React from 'react';
import { AlertCircle, CheckCircle, Info, AlertTriangle, X } from 'lucide-react';

interface AlertProps {
  children: React.ReactNode;
  variant?: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  dismissible?: boolean;
  onDismiss?: () => void;
  className?: string;
}

export function Alert({
  children,
  variant = 'info',
  title,
  dismissible = false,
  onDismiss,
  className = '',
}: AlertProps) {
  const variantStyles = {
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

  const { container, icon: Icon } = variantStyles[variant];

  return (
    <div className={`relative rounded-lg border p-4 ${container} ${className}`}>
      <div className='flex gap-3'>
        <Icon className='w-5 h-5 flex-shrink-0 mt-0.5' />
        <div className='flex-1'>
          {title && <h5 className='mb-1 mt-0'>{title}</h5>}
          <div className='text-sm text-foreground-muted'>{children}</div>
        </div>
        {dismissible && (
          <button
            onClick={onDismiss}
            className='text-foreground-subtle hover:text-foreground transition-colors'
          >
            <X className='w-4 h-4' />
          </button>
        )}
      </div>
    </div>
  );
}
