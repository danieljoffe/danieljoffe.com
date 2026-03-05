'use client';

import { type ReactNode } from 'react';
import { analytics } from '@/lib/analytics';
import Button from '@/components/Button';

export default function CTAButton({
  href,
  target,
  ariaLabel,
  analyticsId,
  children,
}: {
  href: string;
  target?: string;
  ariaLabel: string;
  analyticsId: string;
  children: ReactNode;
}) {
  return (
    <Button
      as='link'
      href={href}
      target={target}
      aria-label={ariaLabel}
      onClick={() => analytics.ctaClick(analyticsId, href)}
      className='font-semibold'
    >
      {children}
    </Button>
  );
}
