'use client';

import FocusTrap from 'focus-trap-react';
import { X } from 'lucide-react';
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  type ReactNode,
  type Ref,
} from 'react';
import { Heading } from './Heading';
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
  ref?: Ref<HTMLDivElement> | undefined;
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
  default: 'bg-surface-elevated border border-border-secondary',
  accent:
    'bg-surface-elevated border border-border-secondary border-l-4 border-l-accent',
  success:
    'bg-surface-elevated border border-border-secondary border-l-4 border-l-success',
  warning:
    'bg-surface-elevated border border-border-secondary border-l-4 border-l-warning',
  error:
    'bg-surface-elevated border border-border-secondary border-l-4 border-l-error',
  info: 'bg-surface-elevated border border-border-secondary border-l-4 border-l-info',
};

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  footer,
  variant = 'default',
  className,
  ref,
}: ModalProps) {
  const triggerRef = useRef<Element | null>(null);

  useEffect(() => {
    if (typeof document === 'undefined') return;

    if (isOpen) {
      triggerRef.current = document.activeElement;
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleClose = useCallback(() => {
    onClose();
    if (triggerRef.current instanceof HTMLElement) {
      triggerRef.current.focus();
    }
  }, [onClose]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, handleClose]);

  const titleId = useId();

  if (!isOpen) return null;

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center p-4'>
      <div
        className='absolute inset-0 bg-surface/80 backdrop-blur-sm'
        onClick={handleClose}
        aria-hidden='true'
      />
      <FocusTrap
        focusTrapOptions={{
          allowOutsideClick: true,
          escapeDeactivates: false,
        }}
      >
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
              <Heading variant='component' id={titleId}>
                {title}
              </Heading>
              <button
                onClick={handleClose}
                aria-label='Close dialog'
                className='text-text-tertiary hover:text-text-primary transition-colors'
              >
                <X className='size-5' aria-hidden='true' />
              </button>
            </div>
          )}
          {!title && (
            <button
              onClick={handleClose}
              aria-label='Close dialog'
              className='absolute top-4 right-4 text-text-tertiary hover:text-text-primary transition-colors'
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
      </FocusTrap>
    </div>
  );
}
