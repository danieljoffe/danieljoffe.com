'use client';

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { cn, FOCUSABLE_SELECTOR } from './utils';

export interface PopoverProps {
  /** Content rendered inside the trigger button. */
  trigger: ReactNode;
  /**
   * Panel content. Pass a render function to receive `close` for explicit
   * dismissal (e.g. an "Apply" button or after an async action completes).
   */
  children: ReactNode | ((ctx: { close: () => void }) => ReactNode);
  align?: 'left' | 'right';
  /** Controlled open state; omit to let the Popover manage its own. */
  open?: boolean | undefined;
  /** Called with the next open state on trigger click, outside click, Escape, and `close`. */
  onOpenChange?: ((open: boolean) => void) | undefined;
  className?: string | undefined;
  /** Merged onto the panel — override width, padding, etc. */
  panelClassName?: string | undefined;
  /** Accessible name for the panel; defaults to labelling by the trigger. */
  'aria-label'?: string | undefined;
}

/**
 * Anchored non-modal panel on a trigger button: outside-click and Escape
 * dismiss, focus moves into the panel on open and back to the trigger on
 * close. Unlike Dropdown (a menu of actions), the panel holds arbitrary
 * content — filters, forms, pickers.
 */
export function Popover({
  trigger,
  children,
  align = 'left',
  open,
  onOpenChange,
  className,
  panelClassName,
  'aria-label': ariaLabel,
}: PopoverProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : uncontrolledOpen;
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const uid = useId();
  const panelId = `popover-panel-${uid}`;
  const triggerId = `popover-trigger-${uid}`;

  const setOpen = useCallback(
    (next: boolean) => {
      if (!isControlled) setUncontrolledOpen(next);
      onOpenChange?.(next);
    },
    [isControlled, onOpenChange]
  );

  const close = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, [setOpen]);

  // Move focus into the panel when it opens: first focusable, else the panel
  const prevOpenRef = useRef(false);
  useEffect(() => {
    if (isOpen && !prevOpenRef.current) {
      requestAnimationFrame(() => {
        const panel = panelRef.current;
        if (!panel) return;
        const focusable = panel.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
        (focusable ?? panel).focus();
      });
    }
    prevOpenRef.current = isOpen;
  }, [isOpen]);

  // Outside click dismisses without moving focus (matches Dropdown)
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen, setOpen]);

  // Escape from anywhere inside (trigger or panel fields) dismisses. A native
  // listener on the wrapper keeps interaction handlers off non-interactive
  // JSX elements (jsx-a11y) while still scoping Escape to this popover.
  useEffect(() => {
    if (!isOpen) return;
    const node = ref.current;
    if (!node) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
      }
    };
    node.addEventListener('keydown', handler);
    return () => node.removeEventListener('keydown', handler);
  }, [isOpen, close]);

  return (
    <div ref={ref} className={cn('relative inline-flex', className)}>
      <button
        ref={triggerRef}
        id={triggerId}
        type='button'
        aria-haspopup='dialog'
        aria-expanded={isOpen}
        aria-controls={isOpen ? panelId : undefined}
        onClick={() => (isOpen ? close() : setOpen(true))}
        className='inline-flex items-center'
      >
        {trigger}
      </button>
      {isOpen && (
        <div
          ref={panelRef}
          id={panelId}
          role='dialog'
          aria-label={ariaLabel}
          aria-labelledby={ariaLabel ? undefined : triggerId}
          tabIndex={-1}
          className={cn(
            'absolute z-50 mt-1 top-full min-w-[240px]',
            'bg-surface-elevated border border-border rounded-lg shadow-lg p-4',
            'animate-slide-down motion-reduce:animate-none',
            align === 'right' ? 'right-0' : 'left-0',
            panelClassName
          )}
        >
          {typeof children === 'function' ? children({ close }) : children}
        </div>
      )}
    </div>
  );
}
