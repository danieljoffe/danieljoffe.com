'use client';

import type { ReactNode } from 'react';
import { analytics } from '@/lib/analytics';
import Button from '@/components/Button';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline';
type ButtonSize = 'sm' | 'md' | 'lg';

interface TrackedButtonLinkProps {
  /** GA4 `cta_name` sent with the `cta_click` event. */
  ctaName: string;
  href: string;
  children: ReactNode;
  // Optional pass-throughs to Button — kept exactly optional (no explicit
  // `| undefined`) so the spread satisfies Button under exactOptionalPropertyTypes.
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  'aria-label'?: string;
}

/**
 * Button-styled link that fires a GA4 `cta_click` on click. The handler is
 * created inside this client component, so it can be dropped straight into a
 * server component (which cannot pass event handlers to the client Button).
 */
export function TrackedButtonLink({
  ctaName,
  href,
  children,
  ...rest
}: TrackedButtonLinkProps) {
  return (
    <Button
      as='link'
      href={href}
      onClick={() => analytics.ctaClick(ctaName, href)}
      {...rest}
    >
      {children}
    </Button>
  );
}

interface TrackedExternalLinkProps {
  /** GA4 `cta_name` sent with the `cta_click` event. */
  ctaName: string;
  href: string;
  children: ReactNode;
  className?: string | undefined;
  'aria-label'?: string | undefined;
}

/**
 * Plain anchor to an external URL (new tab) that fires a GA4 `cta_click`. For
 * link blocks that aren't button-styled — e.g. the "currently building" card.
 */
export function TrackedExternalLink({
  ctaName,
  href,
  children,
  className,
  ...rest
}: TrackedExternalLinkProps) {
  return (
    <a
      href={href}
      target='_blank'
      rel='noopener noreferrer'
      className={className}
      onClick={() => analytics.ctaClick(ctaName, href)}
      {...rest}
    >
      {children}
    </a>
  );
}
