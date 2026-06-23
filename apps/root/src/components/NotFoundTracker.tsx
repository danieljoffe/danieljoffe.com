'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { analytics } from '@/lib/analytics';

/**
 * Fires a GA `not_found` event with the requested path when the 404 page mounts,
 * so broken inbound links (stale URLs, mistyped paths) surface in analytics.
 * Renders nothing.
 */
export default function NotFoundTracker() {
  const pathname = usePathname();

  useEffect(() => {
    analytics.notFound(pathname);
  }, [pathname]);

  return null;
}
