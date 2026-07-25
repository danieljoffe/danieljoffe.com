'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export interface AnchoredPanelOptions {
  /** Controlled open state; omit for internal state. */
  open?: boolean | undefined;
  /** Called with the next open state on every open/close request. */
  onOpenChange?: ((open: boolean) => void) | undefined;
}

/**
 * Open state and dismiss behaviour shared by anchored popups (Popover,
 * Dropdown): controlled/uncontrolled open, outside-mousedown close (without
 * moving focus), and Escape close returning focus to the trigger. Both
 * dismiss listeners attach only while open and are scoped to `wrapperRef`;
 * `triggerRef` is the focus-return target, wherever the trigger element
 * comes from (built-in button or a composed one).
 *
 * Internal to the library — components remain the public surface.
 */
export function useAnchoredPanel({ open, onOpenChange }: AnchoredPanelOptions) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : uncontrolledOpen;
  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

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

  // Outside click dismisses without moving focus
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen, setOpen]);

  // Escape from anywhere inside (trigger or panel fields) dismisses. A native
  // listener on the wrapper keeps interaction handlers off non-interactive
  // JSX elements (jsx-a11y) while still scoping Escape to this popup.
  useEffect(() => {
    if (!isOpen) return;
    const node = wrapperRef.current;
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

  return { isOpen, setOpen, close, wrapperRef, triggerRef };
}
