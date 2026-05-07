'use client';

import { useCallback, useEffect } from 'react';
import Link from 'next/link';
import { LogOut, X, type LucideIcon } from 'lucide-react';
import Button from '@/components/Button';
import { cn } from '@/lib/cn';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import DarkModeToggle from '@/components/Nav/DarkModeToggle';

export interface MoreSheetItem {
  id: string;
  label: string;
  href: string;
  lucide: LucideIcon;
}

interface MoreSheetProps {
  open: boolean;
  onClose: () => void;
  items: MoreSheetItem[];
  activeId: string;
  onSignOut: () => void | Promise<void>;
}

/**
 * Mobile "More" bottom sheet — extracted out of WyrdfoldSidebar so it
 * can be `dynamic({ ssr: false })`-loaded only when the user actually
 * taps "More". Pulls useFocusTrap + the dialog markup off the eager
 * sidebar bundle on every authed page.
 */
export default function MoreSheet({
  open,
  onClose,
  items,
  activeId,
  onSignOut,
}: MoreSheetProps) {
  const sheetRef = useFocusTrap(open) as React.RefObject<HTMLDivElement>;

  const close = useCallback(() => {
    onClose();
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, close]);

  // Lock body scroll while open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <>
      {open && (
        <div
          className='md:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] transition-opacity'
          onClick={close}
          aria-hidden='true'
        />
      )}

      <div
        ref={sheetRef}
        role='dialog'
        aria-label='More navigation'
        aria-modal='true'
        aria-hidden={!open}
        inert={!open ? true : undefined}
        className={cn(
          'md:hidden fixed bottom-0 left-0 right-0 z-50 bg-surface border-t border-border rounded-t-2xl shadow-2xl transition-transform duration-300 ease-out max-h-[60vh] overflow-y-auto px-6 py-5',
          open ? 'translate-y-0' : 'translate-y-full pointer-events-none'
        )}
        style={{
          paddingBottom: open
            ? 'calc(3.5rem + env(safe-area-inset-bottom, 0px) + 1.25rem)'
            : undefined,
        }}
      >
        <div className='flex items-center justify-between mb-3'>
          <span className='text-xs font-semibold text-text-tertiary uppercase tracking-wider'>
            More
          </span>
          <div className='flex items-center gap-1'>
            <DarkModeToggle />
            <Button
              name='wyrdfold-close-more'
              variant='bare'
              size='sm'
              iconOnly
              onClick={close}
              aria-label='Close more menu'
              className='rounded-lg text-text-tertiary hover:text-text-primary'
            >
              <X className='h-4 w-4' />
            </Button>
          </div>
        </div>
        <nav aria-label='More links'>
          <ul className='space-y-1'>
            {items.map(item => {
              const Icon = item.lucide;
              const active = activeId === item.id;
              return (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    onClick={close}
                    className={cn(
                      'w-full flex items-center justify-start gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2',
                      active
                        ? 'text-brand-500 bg-surface-tertiary'
                        : 'text-text-secondary hover:text-text-primary hover:bg-surface-tertiary'
                    )}
                  >
                    <Icon className='h-4 w-4' aria-hidden='true' />
                    {item.label}
                  </Link>
                </li>
              );
            })}
            <li>
              <Button
                name='wyrdfold-more-sign-out'
                variant='bare'
                onClick={() => {
                  close();
                  void onSignOut();
                }}
                className='w-full flex items-center justify-start gap-3 px-3 py-2.5 rounded-lg hover:scale-100 text-sm font-medium transition-colors cursor-pointer text-text-secondary hover:text-text-primary hover:bg-surface-tertiary'
              >
                <LogOut className='h-4 w-4' aria-hidden='true' />
                Sign out
              </Button>
            </li>
          </ul>
        </nav>
      </div>
    </>
  );
}
