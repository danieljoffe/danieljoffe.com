'use client';

import { AlertCircle, AlertTriangle, CheckCircle, Info, X } from 'lucide-react';
import {
  useEffect,
  useCallback,
  type ReactNode,
  type HTMLAttributes,
  type Ref,
} from 'react';
import { Heading } from './Heading';
import {
  SEMANTIC_BG_LIGHT,
  SEMANTIC_BORDER,
  SEMANTIC_TEXT,
  type SemanticVariant,
} from './styles/semanticVariants';
import { cn } from './utils';

export interface AlertProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'children' | 'className' | 'role'
> {
  ref?: Ref<HTMLDivElement> | undefined;
  children: ReactNode;
  variant?: SemanticVariant;
  title?: string | undefined;
  dismissible?: boolean;
  onDismiss?: () => void;
  className?: string;
}

const alertIcons: Record<SemanticVariant, typeof Info> = {
  info: Info,
  success: CheckCircle,
  warning: AlertTriangle,
  error: AlertCircle,
};

const variantStyles: Record<SemanticVariant, string> = {
  info: `${SEMANTIC_BG_LIGHT.info} ${SEMANTIC_BORDER.info} ${SEMANTIC_TEXT.info}`,
  success: `${SEMANTIC_BG_LIGHT.success} ${SEMANTIC_BORDER.success} ${SEMANTIC_TEXT.success}`,
  warning: `${SEMANTIC_BG_LIGHT.warning} ${SEMANTIC_BORDER.warning} ${SEMANTIC_TEXT.warning}`,
  error: `${SEMANTIC_BG_LIGHT.error} ${SEMANTIC_BORDER.error} ${SEMANTIC_TEXT.error}`,
};

export function Alert({
  children,
  variant = 'info',
  title,
  dismissible = false,
  onDismiss,
  className,
  ref,
  ...props
}: AlertProps) {
  const Icon = alertIcons[variant];
  const isUrgent = variant === 'error' || variant === 'warning';

  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDismiss?.();
    },
    [onDismiss]
  );

  useEffect(() => {
    if (!dismissible || !onDismiss) return;
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [dismissible, onDismiss, handleEscape]);

  return (
    <div
      ref={ref}
      role={isUrgent ? 'alert' : 'status'}
      aria-live={isUrgent ? 'assertive' : 'polite'}
      className={cn(
        'relative rounded-lg border p-4',
        variantStyles[variant],
        className
      )}
      {...props}
    >
      <div className='flex gap-3'>
        <Icon className='size-5 shrink-0 mt-0.5' aria-hidden='true' />
        <div className='flex-1'>
          {title && (
            <Heading variant='cardTitle' as='h5' className='mb-1 mt-0'>
              {title}
            </Heading>
          )}
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
