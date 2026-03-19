'use client';

import { type ReactNode } from 'react';
import Link from 'next/link';
import { analytics } from '@/lib/analytics';

export default function ExperienceCardLink({
  href,
  slug,
  children,
}: {
  href: string;
  slug: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={() => analytics.experienceClick(slug)}
      className='group flex items-start gap-4 p-4 rounded-xl border border-border bg-surface-secondary transition-all duration-200 hover:border-brand-500/40 hover:shadow-lg/5'
    >
      {children}
    </Link>
  );
}
