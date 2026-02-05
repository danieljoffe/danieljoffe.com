'use client';

import { X } from 'lucide-react';
import { useEffect, useId, type ReactNode } from 'react';

type ModalSize = 'sm' | 'md' | 'lg' | 'xl';
type ModalVariant =
  | 'default'
  | 'accent'
  | 'success'
  | 'warning'
  | 'error'
  | 'info';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: ModalSize;
  footer?: ReactNode;
  variant?: ModalVariant;
}

const sizeStyles: Record<ModalSize, string> = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

const variantStyles: Record<ModalVariant, string> = {
  default: 'bg-background-elevated border border-border-strong',
  accent:
    'bg-background-elevated border-l-4 border-l-accent border border-border-strong',
  success:
    'bg-background-elevated border-l-4 border-l-success border border-border-strong',
  warning:
    'bg-background-elevated border-l-4 border-l-warning border border-border-strong',
  error:
    'bg-background-elevated border-l-4 border-l-error border border-border-strong',
  info: 'bg-background-elevated border-l-4 border-l-info border border-border-strong',
};

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  footer,
  variant = 'default',
}: ModalProps) {
  useEffect(() => {
    if (typeof document === 'undefined') return;

    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const titleId = useId();

  if (!isOpen) return null;

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center p-4'>
      <div
        className='absolute inset-0 bg-background/80 backdrop-blur-sm'
        onClick={onClose}
        aria-hidden='true'
      />
      <div
        role='dialog'
        aria-modal='true'
        aria-labelledby={title ? titleId : undefined}
        aria-label={title ? undefined : 'Dialog'}
        className={`relative w-full ${sizeStyles[size]} ${variantStyles[variant]} rounded-lg shadow-2xl`}
      >
        {title && (
          <div className='flex items-center justify-between p-6 border-b border-border'>
            <h3 id={titleId}>{title}</h3>
            <button
              onClick={onClose}
              aria-label='Close dialog'
              className='text-foreground-subtle hover:text-foreground transition-colors'
            >
              <X className='w-5 h-5' aria-hidden='true' />
            </button>
          </div>
        )}
        {!title && (
          <button
            onClick={onClose}
            aria-label='Close dialog'
            className='absolute top-4 right-4 text-foreground-subtle hover:text-foreground transition-colors'
          >
            <X className='w-5 h-5' aria-hidden='true' />
          </button>
        )}
        <div className='p-6'>{children}</div>
        {footer && (
          <div className='flex items-center justify-end gap-3 p-6 border-t border-border'>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
