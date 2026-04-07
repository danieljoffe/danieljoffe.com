'use client';

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { cn } from './utils/cn';

export interface DropdownItem {
  label: string;
  icon?: ReactNode;
  onClick?: () => void;
  danger?: boolean;
  divider?: boolean;
  disabled?: boolean;
}

export interface DropdownProps {
  trigger: ReactNode;
  items: DropdownItem[];
  align?: 'left' | 'right';
  className?: string;
}

export function Dropdown({
  trigger,
  items,
  align = 'left',
  className,
}: DropdownProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const uid = useId();
  const menuId = `dropdown-menu-${uid}`;
  const triggerId = `dropdown-trigger-${uid}`;

  const actionableItems = useMemo(
    () =>
      items.reduce<number[]>((acc, item, i) => {
        if (!item.divider && !item.disabled) acc.push(i);
        return acc;
      }, []),
    [items]
  );

  const focusItem = useCallback((index: number) => {
    setActiveIndex(index);
    itemRefs.current[index]?.focus();
  }, []);

  const openMenu = useCallback(() => {
    setOpen(true);
  }, []);

  const closeMenu = useCallback(() => {
    setOpen(false);
    setActiveIndex(-1);
    triggerRef.current?.focus();
  }, []);

  // Focus first actionable item when menu opens
  const prevOpenRef = useRef(false);
  useEffect(() => {
    const firstActionable = actionableItems[0];
    if (open && !prevOpenRef.current && firstActionable != null) {
      requestAnimationFrame(() => {
        focusItem(firstActionable);
      });
    }
    prevOpenRef.current = open;
  }, [open, actionableItems, focusItem]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setActiveIndex(-1);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleTriggerKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) {
        openMenu();
      }
    } else if (e.key === 'Escape' && open) {
      e.preventDefault();
      closeMenu();
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
      case 'Escape': {
        e.preventDefault();
        closeMenu();
        break;
      }
      case 'Enter':
      case ' ': {
        e.preventDefault();
        if (activeIndex >= 0) {
          const item = items[activeIndex];
          if (item && !item.divider && !item.disabled) {
            item.onClick?.();
            setOpen(false);
            setActiveIndex(-1);
            triggerRef.current?.focus();
          }
        }
        break;
      }
      case 'Tab': {
        closeMenu();
        break;
      }
    }
  };

  return (
    <div ref={ref} className={cn('relative inline-flex', className)}>
      <button
        ref={triggerRef}
        id={triggerId}
        type='button'
        aria-haspopup='true'
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => (open ? closeMenu() : openMenu())}
        onKeyDown={handleTriggerKeyDown}
        className='inline-flex items-center'
      >
        {trigger}
      </button>
      {open && (
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
            align === 'right' ? 'right-0' : 'left-0'
          )}
        >
          {items.map((item, i) =>
            item.divider ? (
              <div
                key={i}
                role='separator'
                className='my-1 border-t border-border'
              />
            ) : (
              <button
                key={i}
                ref={el => {
                  itemRefs.current[i] = el;
                }}
                role='menuitem'
                tabIndex={i === activeIndex ? 0 : -1}
                disabled={item.disabled}
                onClick={() => {
                  item.onClick?.();
                  setOpen(false);
                  setActiveIndex(-1);
                  triggerRef.current?.focus();
                }}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left',
                  'transition-colors duration-100 cursor-pointer',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2',
                  'focus-visible:ring-offset-surface',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  item.danger
                    ? 'text-error hover:bg-error-light'
                    : 'text-text-primary hover:bg-surface-tertiary'
                )}
              >
                {item.icon && (
                  <span className='h-4 w-4 shrink-0'>{item.icon}</span>
                )}
                {item.label}
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}
