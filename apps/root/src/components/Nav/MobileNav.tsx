'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Briefcase,
  FolderKanban,
  Award,
  MoreHorizontal,
  User,
  BookOpen,
  X,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { analytics } from '@/lib/analytics';
import {
  PRIMARY_NAV_LINKS,
  MORE_NAV_LINKS,
  AUDIT_LINK,
} from '@/utils/constants';
import Logo from './Logo';
import SearchTrigger from './SearchTrigger';
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

  const openSheet = useCallback(() => {
    analytics.mobileMenuToggle('open');
    setSheetOpen(true);
  }, []);

  const closeSheet = useCallback(() => {
    analytics.mobileMenuToggle('close');
    setSheetOpen(false);
  }, []);

  const handleSheetLink = useCallback(
    (label: string, href: string) => {
      analytics.navClick(label);
      closeSheet();
      router.push(href);
    },
    [closeSheet, router]
  );

  const isMoreActive =
    MORE_NAV_LINKS.some(l => pathname === l.href) ||
    pathname === AUDIT_LINK.href;

  return (
    <>
      {/* Top header — logo, search, theme */}
      <div className='md:hidden flex items-center justify-between w-full h-14 px-6'>
        <Logo />
        <div className='flex items-center gap-1'>
          <SearchTrigger />
          <DarkModeToggle />
        </div>
      </div>

      {/* Fixed bottom bar */}
      <div
        className='md:hidden fixed bottom-0 left-0 right-0 z-50 bg-surface/95 backdrop-blur-md border-t border-border/60'
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <nav
          className='flex items-stretch justify-around h-14'
          aria-label='Mobile navigation'
        >
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

      {/* Bottom sheet overlay */}
      {sheetOpen && (
        <>
          <div
            className='md:hidden fixed inset-0 z-40 bg-black/40'
            onClick={closeSheet}
            aria-hidden='true'
          />
          <div
            className='md:hidden fixed bottom-14 left-0 right-0 z-50 bg-surface border-t border-border rounded-t-2xl p-4 pb-2 animate-slide-up'
            role='dialog'
            aria-label='More navigation'
          >
            <div className='flex items-center justify-between mb-3'>
              <span className='text-sm font-medium text-text-primary'>
                More
              </span>
              <button
                onClick={closeSheet}
                aria-label='Close more menu'
                className='p-1.5 rounded-lg text-text-tertiary hover:text-text-primary transition-colors cursor-pointer'
              >
                <X className='h-4 w-4' />
              </button>
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
      )}
    </>
  );
}
