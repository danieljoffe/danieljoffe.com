'use client';

import { type ReactNode } from 'react';
import { analytics } from '@/lib/analytics';
import Button from '@/components/Button';

export default function CompanyLink({
  href,
  slug,
  company,
  children,
}: {
  href: string;
  slug: string;
  company: string;
  children: ReactNode;
}) {
  return (
    <Button
      as='link'
      variant='bare'
      size='lg'
      href={href}
      aria-label={company}
      title={company}
      onClick={() => analytics.experienceClick(slug)}
    >
      {children}
    </Button>
  );
}
