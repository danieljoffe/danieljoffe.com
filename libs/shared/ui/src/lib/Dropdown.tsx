'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
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
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className={cn('relative inline-flex', className)}>
      <button
        type='button'
        onClick={() => setOpen(!open)}
        className='inline-flex items-center'
      >
        {trigger}
      </button>
      {open && (
        <div
          className={cn(
            'absolute z-50 mt-1 top-full min-w-[180px]',
            'bg-surface-elevated border border-border rounded-lg shadow-lg',
            'py-1 animate-slide-down',
            align === 'right' ? 'right-0' : 'left-0'
          )}
        >
          {items.map((item, i) =>
            item.divider ? (
              <div key={i} className='my-1 border-t border-border' />
            ) : (
              <button
                key={i}
                disabled={item.disabled}
                onClick={() => {
                  item.onClick?.();
                  setOpen(false);
                }}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left',
                  'transition-colors duration-100 cursor-pointer',
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
