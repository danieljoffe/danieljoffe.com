'use client';

import { X } from 'lucide-react';
import { forwardRef, useEffect, useId, type ReactNode } from 'react';
import { cn } from './utils';

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
  title?: string | undefined;
  children: ReactNode;
  size?: ModalSize;
  footer?: ReactNode;
  variant?: ModalVariant;
  className?: string | undefined;
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
    'bg-background-elevated border border-border-strong border-l-4 border-l-accent',
  success:
    'bg-background-elevated border border-border-strong border-l-4 border-l-success',
  warning:
    'bg-background-elevated border border-border-strong border-l-4 border-l-warning',
  error:
    'bg-background-elevated border border-border-strong border-l-4 border-l-error',
  info: 'bg-background-elevated border border-border-strong border-l-4 border-l-info',
};

export const Modal = forwardRef<HTMLDivElement, ModalProps>(
  (
    {
      isOpen,
      onClose,
      title,
      children,
      size = 'md',
      footer,
      variant = 'default',
      className,
    },
    ref
  ) => {
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
          ref={ref}
          role='dialog'
          aria-modal='true'
          aria-labelledby={title ? titleId : undefined}
          aria-label={title ? undefined : 'Dialog'}
          className={cn(
            'relative w-full rounded-lg shadow-2xl',
            sizeStyles[size],
            variantStyles[variant],
            className
          )}
        >
          {title && (
            <div className='flex items-center justify-between p-6 border-b border-border'>
              <h3 id={titleId}>{title}</h3>
              <button
                onClick={onClose}
                aria-label='Close dialog'
                className='text-foreground-subtle hover:text-foreground transition-colors'
              >
                <X className='size-5' aria-hidden='true' />
              </button>
            </div>
          )}
          {!title && (
            <button
              onClick={onClose}
              aria-label='Close dialog'
              className='absolute top-4 right-4 text-foreground-subtle hover:text-foreground transition-colors'
            >
              <X className='size-5' aria-hidden='true' />
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
);
Modal.displayName = 'Modal';
