'use client';

import { X } from 'lucide-react';
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
  type Ref,
} from 'react';
import { Button } from './Button';
import { Heading } from './Heading';
import { DISMISS_BUTTON } from './styles/formStyles';
import { cn, FOCUSABLE_SELECTOR } from './utils';

type ModalSize = 'sm' | 'md' | 'lg' | 'xl';
type ModalVariant = 'default';
export type ModalPlacement = 'center' | 'sheet';

export interface ModalProps {
  ref?: Ref<HTMLDivElement> | undefined;
  isOpen: boolean;
  onClose: () => void;
  title?: string | undefined;
  children: ReactNode;
  size?: ModalSize;
  footer?: ReactNode;
  variant?: ModalVariant;
  /** `sheet` anchors the dialog to the bottom edge as a mobile bottom sheet. */
  placement?: ModalPlacement;
  className?: string | undefined;
  /** Merged onto the scrollable body — override its padding, add safe-area insets, etc. */
  bodyClassName?: string | undefined;
  /** Accessible name for the dialog when there is no `title`. */
  'aria-label'?: string | undefined;
  /** Hide the built-in dismiss X when the content supplies its own close affordance. */
  showCloseButton?: boolean;
  closeOnBackdropClick?: boolean;
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

const placementWrapperStyles: Record<ModalPlacement, string> = {
  center: 'items-center p-4',
  sheet: 'items-end',
};

const placementPanelStyles: Record<ModalPlacement, string> = {
  center: 'max-h-[calc(100dvh-2rem)] rounded-lg',
  sheet: 'max-h-[85dvh] rounded-t-lg',
};

/** Matches the `sheet-out` animation duration in the consuming theme. */
const SHEET_EXIT_MS = 250;

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  footer,
  variant = 'default',
  placement = 'center',
  className,
  bodyClassName,
  'aria-label': ariaLabel,
  showCloseButton = true,
  closeOnBackdropClick = true,
  ref,
}: ModalProps) {
  const triggerRef = useRef<Element | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Sheets slide out before unmounting (same dismissing pattern as Toast);
  // centered dialogs have no entrance animation, so they close instantly.
  const [exiting, setExiting] = useState(false);
  const prevOpenRef = useRef(isOpen);
  useEffect(() => {
    const wasOpen = prevOpenRef.current;
    prevOpenRef.current = isOpen;
    if (isOpen) {
      setExiting(false);
      return undefined;
    }
    if (wasOpen && placement === 'sheet') {
      setExiting(true);
      const timer = setTimeout(() => setExiting(false), SHEET_EXIT_MS);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [isOpen, placement]);

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

  const isExiting = !isOpen && exiting;
  if (!isOpen && !exiting) return null;

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex justify-center',
        placementWrapperStyles[placement],
        isExiting && 'pointer-events-none'
      )}
    >
      {/* The backdrop pops away at close-start while the sheet slides out —
          keeping dismissal feedback immediate. */}
      {isOpen && (
        <div
          className='absolute inset-0 bg-surface/80 backdrop-blur-sm'
          onClick={closeOnBackdropClick ? handleClose : undefined}
          aria-hidden='true'
        />
      )}
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
        inert={isExiting || undefined}
        aria-labelledby={title ? titleId : undefined}
        aria-label={title ? undefined : (ariaLabel ?? 'Dialog')}
        className={cn(
          'relative flex w-full flex-col overflow-hidden shadow-2xl',
          placementPanelStyles[placement],
          placement === 'sheet' &&
            cn(
              'motion-reduce:animate-none',
              isExiting ? 'animate-sheet-out' : 'animate-sheet-in'
            ),
          sizeStyles[size],
          variantStyles[variant],
          className
        )}
      >
        {title && (
          <div className='flex shrink-0 items-center justify-between p-4 sm:p-6 border-b border-border'>
            <Heading variant='component' id={titleId}>
              {title}
            </Heading>
            {showCloseButton && (
              <Button
                variant='bare'
                size='sm'
                onClick={handleClose}
                aria-label='Close dialog'
                className={DISMISS_BUTTON}
              >
                <X className='size-5' aria-hidden='true' />
              </Button>
            )}
          </div>
        )}
        {!title && showCloseButton && (
          <Button
            variant='bare'
            size='sm'
            onClick={handleClose}
            aria-label='Close dialog'
            className={cn('absolute top-4 right-4', DISMISS_BUTTON)}
          >
            <X className='size-5' aria-hidden='true' />
          </Button>
        )}
        {/* eslint-disable jsx-a11y/no-noninteractive-tabindex -- focusable scroll region so keyboard users can scroll overflowing content (axe scrollable-region-focusable / WCAG 2.1.1) */}
        <div
          className={cn(
            'min-h-0 flex-1 overflow-y-auto p-4 sm:p-6',
            bodyClassName
          )}
          tabIndex={0}
        >
          {children}
        </div>
        {/* eslint-enable jsx-a11y/no-noninteractive-tabindex */}
        {footer && (
          <div className='flex shrink-0 items-center justify-end gap-3 p-4 sm:p-6 border-t border-border'>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
