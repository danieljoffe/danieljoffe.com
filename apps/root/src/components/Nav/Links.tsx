'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/cn';
import { analytics } from '@/lib/analytics';
import { NAV_LINKS } from '@/utils/constants';

export default function NavLinks({
  pathname,
  handleClick,
}: {
  pathname?: string;
  handleClick?: () => void;
}) {
  const router = useRouter();

  const handleLinkClick = (
    e: React.MouseEvent,
    label: string,
    href: string
  ) => {
    analytics.navClick(label);
    if (handleClick) {
      e.preventDefault();
      handleClick();
      router.push(href);
    }
  };

  return (
    <div className='flex flex-col gap-4 h-full w-full justify-center items-center md:flex-row md:justify-end'>
      <ul
        className='flex flex-col gap-1 items-center md:flex-row'
        role='menubar'
      >
        {NAV_LINKS.map(link => (
          <li key={link.href} className='flex items-center' role='none'>
            <Link
              href={link.href}
              onClick={(e: React.MouseEvent) =>
                handleLinkClick(e, link.label, link.href)
              }
              role='menuitem'
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
          </li>
        ))}
      </ul>
    </div>
  );
}
