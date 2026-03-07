'use client';

import Button from '@/components/Button';
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
      // Mobile modal context: close the modal first, then navigate
      // programmatically because HeadlessUI Dialog renders in a portal.
      e.preventDefault();
      handleClick();
      router.push(href);
    }
  };

  return (
    <div className='flex flex-col gap-4 h-full w-full justify-center items-center md:flex-row md:justify-end'>
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
              onClick={(e: React.MouseEvent) =>
                handleLinkClick(e, link.label, link.href)
              }
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
      <Button
        variant='primary'
        size='sm'
        as='link'
        href={AUDIT_LINK.href}
        onClick={(e: React.MouseEvent) =>
          handleLinkClick(e, AUDIT_LINK.label, AUDIT_LINK.href)
        }
        aria-current={pathname === AUDIT_LINK.href ? 'page' : undefined}
        aria-label={`Navigate to ${AUDIT_LINK.label} page`}
        className='md:ml-4 lowercase'
      >
        {AUDIT_LINK.label}
      </Button>
    </div>
  );
}
