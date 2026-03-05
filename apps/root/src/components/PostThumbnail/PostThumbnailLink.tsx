'use client';

import { type ReactNode } from 'react';
import { Link } from 'next-transition-router';
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
        'flex flex-col h-full overflow-hidden rounded-md border border-border bg-card',
        'transition-[scale] duration-300 ease-in-out hover:outline-accent',
        'hover:scale-[1.025] hover:outline hover:outline-2 hover:outline-offset-2 hover:shadow-lg/12.5',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        'focus-visible:ring-offset-2 focus-visible:ring-offset-background',
      ].join(' ')}
    >
      {children}
    </Link>
  );
}
