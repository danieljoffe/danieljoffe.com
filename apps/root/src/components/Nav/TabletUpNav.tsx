'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronDown, User, BookOpen, Sparkles, Blocks } from 'lucide-react';
import Image from 'next/image';
import { Dropdown, type DropdownItem } from '@danieljoffe/shared-ui/Dropdown';
import { cn } from '@/lib/cn';
import { analytics } from '@/lib/analytics';
import {
  PRIMARY_NAV_LINKS,
  MORE_NAV_LINKS,
  EXTERNAL_NAV_LINKS,
  HOME_LINK,
} from '@/utils/constants';
import SearchTrigger from './SearchTrigger';
import DarkModeToggle from './DarkModeToggle';

const moreIcons: Record<string, React.ReactNode> = {
  '/about': <User className='h-4 w-4' />,
  '/blog': <BookOpen className='h-4 w-4' />,
};

const externalIcons: Record<string, React.ReactNode> = {
  Wyrdfold: <Sparkles className='h-4 w-4' />,
  'Shared UI': <Blocks className='h-4 w-4' />,
};

export default function TabletUpNav({ pathname }: { pathname: string }) {
  const router = useRouter();

  const moreItems: DropdownItem[] = [
    ...MORE_NAV_LINKS.map(link => ({
      label: link.label,
      icon: moreIcons[link.href],
      onClick: () => {
        analytics.navClick(link.label);
        router.push(link.href);
      },
    })),
    { label: '', divider: true },
    ...EXTERNAL_NAV_LINKS.map(link => ({
      label: link.label,
      icon: externalIcons[link.label],
      href: link.href,
      external: true,
      onClick: () => analytics.navClick(link.label),
    })),
  ];

  const isMoreActive = MORE_NAV_LINKS.some(link => pathname === link.href);

  return (
    <div className='hidden md:flex max-w-4xl mx-auto px-6 lg:px-0 h-14 items-center gap-1'>
      <Link
        href={HOME_LINK.href}
        aria-label={HOME_LINK.label}
        className='flex items-center'
      >
        <Image src='/logo.svg' alt={HOME_LINK.label} width={32} height={32} />
      </Link>

      <nav className='flex items-center gap-1 ml-6' aria-label='Primary'>
        {PRIMARY_NAV_LINKS.map(link => (
          <Link
            key={link.href}
            href={link.href}
            onClick={() => analytics.navClick(link.label)}
            aria-current={pathname === link.href ? 'page' : undefined}
            className={cn(
              'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
              pathname === link.href
                ? 'text-text-primary bg-surface-tertiary'
                : 'text-text-secondary hover:text-text-primary hover:bg-surface-tertiary'
            )}
          >
            {link.label}
          </Link>
        ))}

        <Dropdown
          trigger={
            <span
              className={cn(
                'flex items-center gap-0.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                isMoreActive
                  ? 'text-text-primary bg-surface-tertiary'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-tertiary'
              )}
            >
              More
              <ChevronDown className='h-3.5 w-3.5' aria-hidden='true' />
            </span>
          }
          items={moreItems}
          align='left'
        />
      </nav>

      <div className='ml-auto flex items-center gap-1'>
        <SearchTrigger />
        <DarkModeToggle />
      </div>
    </div>
  );
}
