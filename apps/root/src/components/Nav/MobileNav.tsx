'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Briefcase,
  FolderKanban,
  Award,
  Home,
  MoreHorizontal,
  Search,
  User,
  BookOpen,
  X,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { analytics } from '@/lib/analytics';
import {
  HOME_LINK,
  PRIMARY_NAV_LINKS,
  MORE_NAV_LINKS,
  AUDIT_LINK,
} from '@/utils/constants';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import DarkModeToggle from './DarkModeToggle';

const primaryIcons: Record<string, typeof Briefcase> = {
  '/services': Briefcase,
  '/projects': FolderKanban,
  '/experience': Award,
};

const moreSheetLinks = [
  ...MORE_NAV_LINKS.map(link => ({
    ...link,
    icon: link.href === '/about' ? User : BookOpen,
  })),
  { ...AUDIT_LINK, icon: Briefcase },
];

export default function MobileNav({ pathname }: { pathname: string }) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const router = useRouter();
  const moreButtonRef = useRef<HTMLButtonElement>(null);
  const sheetRef = useFocusTrap(sheetOpen) as React.RefObject<HTMLDivElement>;

  const openSheet = useCallback(() => {
    analytics.mobileMenuToggle('open');
    setSheetOpen(true);
  }, []);

  const closeSheet = useCallback(() => {
    analytics.mobileMenuToggle('close');
    setSheetOpen(false);
    moreButtonRef.current?.focus();
  }, []);

  // Close on Escape
  useEffect(() => {
    if (!sheetOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeSheet();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [sheetOpen, closeSheet]);

  // Lock body scroll when sheet is open
  useEffect(() => {
    if (sheetOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [sheetOpen]);

  const handleSheetLink = useCallback(
    (label: string, href: string) => {
      analytics.navClick(label);
      setSheetOpen(false);
      requestAnimationFrame(() => router.push(href));
    },
    [router]
  );

  const isMoreActive =
    MORE_NAV_LINKS.some(l => pathname === l.href) ||
    pathname === AUDIT_LINK.href;

  const isHome = pathname === '/';

  const handleSearchClick = useCallback(() => {
    document.dispatchEvent(new CustomEvent('open-command-palette'));
  }, []);

  return (
    <>
      {/* Fixed bottom bar */}
      <div
        className='md:hidden fixed bottom-0 left-0 right-0 z-50 bg-surface/95 backdrop-blur-md border-t border-border/60'
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <nav
          className='flex items-stretch justify-around h-14'
          aria-label='Mobile navigation'
        >
          {/* Home / Logo */}
          <Link
            href={HOME_LINK.href}
            aria-label={HOME_LINK.label}
            aria-current={isHome ? 'page' : undefined}
            className={cn(
              'flex flex-col items-center justify-center flex-1 gap-0.5 text-[10px] font-medium transition-colors',
              isHome
                ? 'text-brand-500'
                : 'text-text-tertiary active:text-text-primary'
            )}
          >
            <Home className='h-5 w-5' aria-hidden='true' />
            Home
          </Link>

          {PRIMARY_NAV_LINKS.map(link => {
            const Icon = primaryIcons[link.href] ?? Briefcase;
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => analytics.navClick(link.label)}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex flex-col items-center justify-center flex-1 gap-0.5 text-[10px] font-medium transition-colors',
                  active
                    ? 'text-brand-500'
                    : 'text-text-tertiary active:text-text-primary'
                )}
              >
                <Icon className='h-5 w-5' aria-hidden='true' />
                {link.label}
              </Link>
            );
          })}

          <button
            onClick={handleSearchClick}
            aria-label='Search (⌘K)'
            data-testid='search-trigger'
            className='flex flex-col items-center justify-center flex-1 gap-0.5 text-[10px] font-medium transition-colors cursor-pointer text-text-tertiary active:text-text-primary'
          >
            <Search className='h-5 w-5' aria-hidden='true' />
            Search
          </button>

          <button
            ref={moreButtonRef}
            onClick={sheetOpen ? closeSheet : openSheet}
            aria-expanded={sheetOpen}
            aria-label={sheetOpen ? 'Close more menu' : 'Open more menu'}
            className={cn(
              'flex flex-col items-center justify-center flex-1 gap-0.5 text-[10px] font-medium transition-colors cursor-pointer',
              isMoreActive || sheetOpen
                ? 'text-brand-500'
                : 'text-text-tertiary active:text-text-primary'
            )}
          >
            <MoreHorizontal className='h-5 w-5' aria-hidden='true' />
            More
          </button>
        </nav>
      </div>

      {/* Backdrop */}
      {sheetOpen && (
        <div
          className='md:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] transition-opacity'
          onClick={closeSheet}
          aria-hidden='true'
        />
      )}

      {/* Bottom sheet — slides up like TableOfContents */}
      <div
        ref={sheetRef}
        role='dialog'
        aria-label='More navigation'
        aria-modal='true'
        aria-hidden={!sheetOpen}
        inert={!sheetOpen ? true : undefined}
        className={cn(
          'md:hidden fixed bottom-0 left-0 right-0 z-50 bg-surface border-t border-border rounded-t-2xl shadow-2xl transition-transform duration-300 ease-out max-h-[60vh] overflow-y-auto px-6 py-5',
          sheetOpen ? 'translate-y-0' : 'translate-y-full pointer-events-none'
        )}
        style={{
          paddingBottom: sheetOpen
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
            <button
              onClick={closeSheet}
              aria-label='Close more menu'
              className='p-1.5 rounded-lg text-text-tertiary hover:text-text-primary transition-colors cursor-pointer'
            >
              <X className='h-4 w-4' />
            </button>
          </div>
        </div>
        <nav aria-label='More links'>
          <ul className='space-y-1'>
            {moreSheetLinks.map(link => {
              const Icon = link.icon;
              const active = pathname === link.href;
              return (
                <li key={link.href}>
                  <button
                    onClick={() => handleSheetLink(link.label, link.href)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer',
                      active
                        ? 'text-brand-500 bg-surface-tertiary'
                        : 'text-text-secondary hover:text-text-primary hover:bg-surface-tertiary'
                    )}
                  >
                    <Icon className='h-4 w-4' aria-hidden='true' />
                    {link.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </>
  );
}
