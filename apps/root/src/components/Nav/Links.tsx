'use client';

import Button from '@/components/Button';
import { analytics } from '@/lib/analytics';
import { NAV_LINKS } from '@/utils/constants';
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
      // Mobile modal context: navigate programmatically because the
      // HeadlessUI Dialog renders in a portal outside the TransitionRouter's
      // DOM subtree, preventing next-transition-router from intercepting
      // the Link click. router.push() triggers the transition via auto mode.
      e.preventDefault();
      handleClick();
      router.push(href);
    }
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
    </div>
  );
}
