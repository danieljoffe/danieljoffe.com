'use client';

import { useEffect, useId, useRef, type ReactNode, type Ref } from 'react';
import { cn, FOCUSABLE_SELECTOR, useAnchoredPanel } from './utils';

/**
 * Wiring the Popover injects into a composed trigger. Spread every prop onto
 * your interactive element — the popover keeps owning open state, dismiss,
 * focus return, and aria wiring.
 */
export interface PopoverTriggerProps {
  ref: Ref<HTMLButtonElement>;
  id: string;
  /** Guards against implicit form submission when the popover sits in a form. */
  type: 'button';
  'aria-haspopup': 'dialog';
  'aria-expanded': boolean;
  'aria-controls': string | undefined;
  onClick: () => void;
}

export interface PopoverProps {
  /**
   * Content rendered inside the built-in trigger button — or a render
   * function receiving {@link PopoverTriggerProps} to supply your own trigger
   * element (a design-system Button, a styled pill…). Spread all injected
   * props onto the element you return.
   */
  trigger: ReactNode | ((props: PopoverTriggerProps) => ReactNode);
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
  const { isOpen, setOpen, close, wrapperRef, triggerRef } = useAnchoredPanel({
    open,
    onOpenChange,
  });
  const panelRef = useRef<HTMLDivElement>(null);
  const uid = useId();
  const panelId = `popover-panel-${uid}`;
  const triggerId = `popover-trigger-${uid}`;

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

  const triggerProps: PopoverTriggerProps = {
    ref: triggerRef,
    id: triggerId,
    type: 'button',
    'aria-haspopup': 'dialog',
    'aria-expanded': isOpen,
    'aria-controls': isOpen ? panelId : undefined,
    onClick: () => (isOpen ? close() : setOpen(true)),
  };

  return (
    <div ref={wrapperRef} className={cn('relative inline-flex', className)}>
      {typeof trigger === 'function' ? (
        trigger(triggerProps)
      ) : (
        <button {...triggerProps} className='inline-flex items-center'>
          {trigger}
        </button>
      )}
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
