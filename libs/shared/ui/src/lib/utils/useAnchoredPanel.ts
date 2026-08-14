'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface AnchoredPanelOptions {
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
  // For panels rendered in a PORTAL (Dropdown's menu): the panel is no
  // longer a DOM descendant of the wrapper, so dismiss containment and the
  // Escape listener must cover this node too. Inline panels (Popover) leave
  // it unset — null is simply skipped below.
  //
  // Deliberately a state-backed CALLBACK ref, not a plain ref: a portaled
  // panel can mount in a later commit than the open flip (it waits for
  // hydration), and a plain ref would leave the effects below bound to
  // whatever existed when `isOpen` turned true — silently dropping Escape on
  // a panel that appeared a commit later. Storing the node in state re-runs
  // them when it actually arrives.
  const [panelNode, setPanelNode] = useState<HTMLDivElement | null>(null);
  const panelRef = useCallback((node: HTMLDivElement | null) => {
    setPanelNode(node);
  }, []);

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

  // Outside click dismisses without moving focus. "Inside" means the wrapper
  // OR the (possibly portaled) panel — a portaled panel is not a wrapper
  // descendant, and without the second check every click on one of its items
  // would read as outside and close the menu before the item's onClick.
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      const insideWrapper = wrapperRef.current?.contains(target) ?? false;
      const insidePanel = panelNode?.contains(target) ?? false;
      if (!insideWrapper && !insidePanel) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen, setOpen, panelNode]);

  // Escape from anywhere inside (trigger or panel fields) dismisses. Native
  // listeners keep interaction handlers off non-interactive JSX elements
  // (jsx-a11y) while still scoping Escape to this popup. The panel gets its
  // own listener for the portaled case — its keydowns bubble to document.body,
  // not the wrapper.
  useEffect(() => {
    if (!isOpen) return;
    const nodes = [wrapperRef.current, panelNode].filter(
      (n): n is HTMLDivElement => n !== null
    );
    if (nodes.length === 0) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
      }
    };
    for (const node of nodes) node.addEventListener('keydown', handler);
    return () => {
      for (const node of nodes) node.removeEventListener('keydown', handler);
    };
  }, [isOpen, close, panelNode]);

  return { isOpen, setOpen, close, wrapperRef, triggerRef, panelRef };
}
