'use client';

import { ExternalLink } from 'lucide-react';
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type Ref,
} from 'react';
import { Spinner } from './Spinner';
import { cn } from './utils/cn';
import { useAnchoredPanel } from './utils/useAnchoredPanel';

export interface DropdownItem {
  /** Item text — also the accessible name when `content` is provided. */
  label: string;
  icon?: ReactNode;
  onClick?: () => void;
  /** Render the item as an anchor pointing here instead of a button. */
  href?: string;
  /** Open `href` in a new tab and show a trailing external-link affordance. */
  external?: boolean;
  danger?: boolean;
  divider?: boolean;
  disabled?: boolean;
  /**
   * Pending state: shows a spinner in the icon slot and makes the item
   * non-actionable (e.g. an async "Adding…" item). Pair with
   * `closeOnClick: false` so the menu stays open while pending.
   */
  loading?: boolean;
  /** Custom item body; replaces the default icon/label/external rendering. */
  content?: ReactNode;
  /** Set to false to keep the menu open after `onClick` (async pickers). */
  closeOnClick?: boolean;
}

/**
 * Wiring the Dropdown injects into a composed trigger. Spread every prop onto
 * your interactive element — the dropdown keeps owning open state, keyboard
 * nav, dismiss, focus return, and aria wiring.
 */
export interface DropdownTriggerProps {
  ref: Ref<HTMLButtonElement>;
  id: string;
  /** Guards against implicit form submission when the menu sits in a form. */
  type: 'button';
  'aria-haspopup': 'menu';
  'aria-expanded': boolean;
  'aria-controls': string | undefined;
  onClick: () => void;
  /**
   * Opens the menu from ArrowDown/ArrowUp on the trigger; on an already-open
   * menu, moves focus to the first (ArrowDown) or last (ArrowUp) item.
   */
  onKeyDown: (e: React.KeyboardEvent) => void;
}

export interface DropdownProps {
  /**
   * Content rendered inside the built-in trigger button — or a render
   * function receiving {@link DropdownTriggerProps} to supply your own
   * trigger element (a design-system Button, a styled pill…). Spread all
   * injected props onto the element you return.
   */
  trigger: ReactNode | ((props: DropdownTriggerProps) => ReactNode);
  items: DropdownItem[];
  align?: 'left' | 'right';
  /** Controlled open state; omit to let the Dropdown manage its own. */
  open?: boolean | undefined;
  /** Called with the next open state on trigger interaction, item activation, outside click, and Escape. */
  onOpenChange?: ((open: boolean) => void) | undefined;
  className?: string | undefined;
  /** Merged onto the menu — override width, padding, etc. */
  panelClassName?: string | undefined;
}

export function Dropdown({
  trigger,
  items,
  align = 'left',
  open,
  onOpenChange,
  className,
  panelClassName,
}: DropdownProps) {
  const { isOpen, setOpen, close, wrapperRef, triggerRef } = useAnchoredPanel({
    open,
    onOpenChange,
  });
  const [activeIndex, setActiveIndex] = useState(-1);
  const itemRefs = useRef<(HTMLButtonElement | HTMLAnchorElement | null)[]>([]);
  const uid = useId();
  const menuId = `dropdown-menu-${uid}`;
  const triggerId = `dropdown-trigger-${uid}`;

  const actionableItems = useMemo(
    () =>
      items.reduce<number[]>((acc, item, i) => {
        if (!item.divider && !item.disabled && !item.loading) acc.push(i);
        return acc;
      }, []),
    [items]
  );

  const focusItem = useCallback((index: number) => {
    setActiveIndex(index);
    itemRefs.current[index]?.focus();
  }, []);

  // Reset roving focus whenever the menu closes, whichever path closed it
  // (item click, Escape, outside click, controlled flip).
  useEffect(() => {
    if (!isOpen) setActiveIndex(-1);
  }, [isOpen]);

  // Focus first actionable item when menu opens. Deliberately does NOT fire
  // when items become actionable later (async pickers that open in a loading
  // state): stealing focus mid-read could preempt a dismissal — the trigger's
  // ArrowDown/ArrowUp is the explicit way in once items arrive.
  const prevOpenRef = useRef(false);
  useEffect(() => {
    const firstActionable = actionableItems[0];
    if (isOpen && !prevOpenRef.current && firstActionable != null) {
      requestAnimationFrame(() => {
        focusItem(firstActionable);
      });
    }
    prevOpenRef.current = isOpen;
  }, [isOpen, actionableItems, focusItem]);

  const handleTriggerKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isOpen) {
        setOpen(true);
      } else {
        // Menu already open with focus still on the trigger — happens when it
        // opened with no actionable items (async loading) and items arrived
        // later. Arrowing is the deliberate way in; ArrowUp enters from the
        // end, per the menu-button pattern.
        const target =
          e.key === 'ArrowDown'
            ? actionableItems[0]
            : actionableItems[actionableItems.length - 1];
        if (target != null) focusItem(target);
      }
    }
  };

  const handleMenuKeyDown = (e: React.KeyboardEvent) => {
    const currentActionableIndex = actionableItems.indexOf(activeIndex);

    switch (e.key) {
      case 'ArrowDown': {
        e.preventDefault();
        const nextIdx =
          currentActionableIndex < actionableItems.length - 1
            ? actionableItems[currentActionableIndex + 1]
            : actionableItems[0];
        if (nextIdx != null) focusItem(nextIdx);
        break;
      }
      case 'ArrowUp': {
        e.preventDefault();
        const prevIdx =
          currentActionableIndex > 0
            ? actionableItems[currentActionableIndex - 1]
            : actionableItems[actionableItems.length - 1];
        if (prevIdx != null) focusItem(prevIdx);
        break;
      }
      case 'Home': {
        e.preventDefault();
        const first = actionableItems[0];
        if (first != null) focusItem(first);
        break;
      }
      case 'End': {
        e.preventDefault();
        const last = actionableItems[actionableItems.length - 1];
        if (last != null) focusItem(last);
        break;
      }
      case 'Enter':
      case ' ': {
        e.preventDefault();
        if (activeIndex >= 0) {
          const item = items[activeIndex];
          if (item && !item.divider && !item.disabled && !item.loading) {
            // Anchors navigate via a synthetic click so Space activates them
            // too (anchors only respond to Enter natively); the click handler
            // fires onClick and closes the menu.
            if (item.href) {
              itemRefs.current[activeIndex]?.click();
            } else {
              item.onClick?.();
              if (item.closeOnClick !== false) {
                close();
              }
            }
          }
        }
        break;
      }
      case 'Tab': {
        close();
        break;
      }
    }
  };

  const triggerProps: DropdownTriggerProps = {
    ref: triggerRef,
    id: triggerId,
    type: 'button',
    'aria-haspopup': 'menu',
    'aria-expanded': isOpen,
    'aria-controls': isOpen ? menuId : undefined,
    onClick: () => (isOpen ? close() : setOpen(true)),
    onKeyDown: handleTriggerKeyDown,
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
          id={menuId}
          role='menu'
          aria-labelledby={triggerId}
          tabIndex={-1}
          onKeyDown={handleMenuKeyDown}
          className={cn(
            'absolute z-50 mt-1 top-full min-w-[180px]',
            'bg-surface-elevated border border-border rounded-lg shadow-lg',
            'py-1 animate-slide-down motion-reduce:animate-none',
            align === 'right' ? 'right-0' : 'left-0',
            panelClassName
          )}
        >
          {items.map((item, i) => {
            if (item.divider) {
              return (
                <div
                  key={i}
                  role='separator'
                  className='my-1 border-t border-border'
                />
              );
            }

            const itemClassName = cn(
              'w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left',
              'transition-colors duration-100 cursor-pointer',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2',
              'focus-visible:ring-offset-surface',
              item.disabled && 'opacity-50 cursor-not-allowed',
              item.loading && 'cursor-wait',
              item.danger
                ? 'text-error hover:bg-error-light'
                : 'text-text-primary hover:bg-surface-tertiary'
            );

            const content =
              item.content != null ? (
                item.content
              ) : (
                <>
                  {(item.loading || item.icon) && (
                    <span
                      className='inline-flex h-4 w-4 shrink-0 items-center justify-center'
                      aria-hidden='true'
                    >
                      {item.loading ? <Spinner size='sm' /> : item.icon}
                    </span>
                  )}
                  <span className='flex-1 truncate'>{item.label}</span>
                  {item.external && (
                    <ExternalLink
                      className='ml-2 h-3.5 w-3.5 shrink-0 opacity-60'
                      aria-hidden='true'
                    />
                  )}
                </>
              );

            if (item.href) {
              return (
                <a
                  key={i}
                  ref={el => {
                    itemRefs.current[i] = el;
                  }}
                  role='menuitem'
                  aria-label={item.content != null ? item.label : undefined}
                  href={item.href}
                  target={item.external ? '_blank' : undefined}
                  rel={item.external ? 'noopener noreferrer' : undefined}
                  tabIndex={i === activeIndex ? 0 : -1}
                  onClick={() => {
                    item.onClick?.();
                    if (item.closeOnClick !== false) {
                      close();
                    }
                  }}
                  className={itemClassName}
                >
                  {content}
                </a>
              );
            }

            return (
              <button
                key={i}
                ref={el => {
                  itemRefs.current[i] = el;
                }}
                role='menuitem'
                aria-label={item.content != null ? item.label : undefined}
                tabIndex={i === activeIndex ? 0 : -1}
                aria-disabled={item.disabled || item.loading || undefined}
                aria-busy={item.loading || undefined}
                onClick={() => {
                  if (item.disabled || item.loading) return;
                  item.onClick?.();
                  if (item.closeOnClick !== false) {
                    close();
                  }
                }}
                className={itemClassName}
              >
                {content}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
