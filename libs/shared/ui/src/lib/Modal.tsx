'use client';

import { X } from 'lucide-react';
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  type ReactNode,
  type Ref,
} from 'react';
import { Button } from './Button';
import { Heading } from './Heading';
import { cn } from './utils';

const FOCUSABLE_SELECTOR =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

type ModalSize = 'sm' | 'md' | 'lg' | 'xl';
type ModalVariant = 'default';

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
  const dialogRef = useRef<HTMLDivElement>(null);

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

  // Focus trap: cycle Tab within the dialog
  useEffect(() => {
    if (!isOpen || !dialogRef.current) return;

    const container = dialogRef.current;
    const focusables =
      container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
    const firstFocusable = focusables[0] as HTMLElement | undefined;
    if (firstFocusable) firstFocusable.focus();

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const els = container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      if (els.length === 0) return;
      const first = els[0] as HTMLElement;
      const last = els[els.length - 1] as HTMLElement;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleTab);
    return () => document.removeEventListener('keydown', handleTab);
  }, [isOpen]);

  const titleId = useId();

  if (!isOpen) return null;

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center p-4'>
      <div
        className='absolute inset-0 bg-surface/80 backdrop-blur-sm'
        onClick={handleClose}
        aria-hidden='true'
      />
      <div
        ref={node => {
          (dialogRef as React.MutableRefObject<HTMLDivElement | null>).current =
            node;
          if (typeof ref === 'function') ref(node);
          else if (ref)
            (ref as React.MutableRefObject<HTMLDivElement | null>).current =
              node;
        }}
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
            <Button
              variant='bare'
              size='sm'
              onClick={handleClose}
              aria-label='Close dialog'
              className='text-text-tertiary hover:text-text-primary transition-colors'
            >
              <X className='size-5' aria-hidden='true' />
            </Button>
          </div>
        )}
        {!title && (
          <Button
            variant='bare'
            size='sm'
            onClick={handleClose}
            aria-label='Close dialog'
            className='absolute top-4 right-4 text-text-tertiary hover:text-text-primary transition-colors'
          >
            <X className='size-5' aria-hidden='true' />
          </Button>
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
