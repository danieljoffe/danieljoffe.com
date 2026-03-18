'use client';

import { type ReactNode } from 'react';
import Link from 'next/link';
import { analytics } from '@/lib/analytics';

export default function PostThumbnailLink({
  href,
  slug,
  children,
}: {
  href: string;
  slug: string;
  children: ReactNode;
}) {
  const handleClick = () => {
    if (href.includes('/projects/')) {
      analytics.projectClick(slug);
    } else if (href.includes('/experience/')) {
      analytics.experienceClick(slug);
    }
  };

  return (
    <Link
      href={href}
      onClick={handleClick}
      className={[
        'flex flex-col h-full overflow-hidden rounded-md border border-border bg-surface-elevated',
        'transition-[scale] duration-300 ease-in-out hover:outline-brand-500',
        'hover:scale-[1.025] hover:outline hover:outline-2 hover:outline-offset-2 hover:shadow-lg/12.5',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus',
        'focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
      ].join(' ')}
    >
      {children}
    </Link>
  );
}
