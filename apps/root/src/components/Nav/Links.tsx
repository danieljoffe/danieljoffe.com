'use client';

import Link from 'next/link';
import { cn } from '@/lib/cn';
import { analytics } from '@/lib/analytics';
import { AUDIT_LINK, NAV_LINKS } from '@/utils/constants';
import { useRouter } from 'next/navigation';

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
              aria-label={`Navigate to ${link.label} page`}
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
      <Link
        href={AUDIT_LINK.href}
        onClick={(e: React.MouseEvent) =>
          handleLinkClick(e, AUDIT_LINK.label, AUDIT_LINK.href)
        }
        aria-current={pathname === AUDIT_LINK.href ? 'page' : undefined}
        aria-label={`Navigate to ${AUDIT_LINK.label} page`}
        className='inline-flex items-center px-3 py-1.5 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition-colors md:ml-2'
      >
        {AUDIT_LINK.label}
      </Link>
    </div>
  );
}
