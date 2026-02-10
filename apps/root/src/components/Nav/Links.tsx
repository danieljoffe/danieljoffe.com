'use client';

import Button from '@/components/Button';
import { analytics } from '@/lib/analytics';
import { NAV_LINKS } from '@/utils/base';

export default function NavLinks({
  pathname,
  handleClick,
}: {
  pathname?: string;
  handleClick?: () => void;
}) {
  const handleLinkClick = (label: string) => {
    analytics.navClick(label);
    setTimeout(() => {
      handleClick?.();
    }, 150);
  };

  return (
    <div className='flex flex-col h-full w-full justify-center items-center'>
      <ul
        className='flex flex-col gap-4 items-center md:flex-row lowercase'
        role='menubar'
      >
        {NAV_LINKS.map(link => (
          <li key={link.href} className='flex items-center' role='none'>
            <Button
              variant='bare'
              size='sm'
              as='link'
              href={link.href}
              onClick={() => handleLinkClick(link.label)}
              highlighted={pathname === link.href}
              role='menuitem'
              aria-current={pathname === link.href ? 'page' : undefined}
              aria-label={`Navigate to ${link.label} page`}
              className='font-semibold hover:text-accent'
            >
              {link.label}
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
