'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Politely announces the new page to screen readers on client-side navigation.
 * App Router moves focus to <main> on route change, but nothing conveys *which*
 * page loaded — so an SR user hears "main" and the first content, not the new
 * document title. This live region fills that gap (WCAG 4.1.3 Status Messages).
 *
 * The title is read on a short delay: Next updates document.title during the
 * new route's commit, and a timeout (not rAF, which the View Transition
 * suppresses mid-morph) reliably lands after it settles.
 */
export function RouteAnnouncer() {
  const pathname = usePathname();
  const [message, setMessage] = useState('');
  const firstRender = useRef(true);

  useEffect(() => {
    // Skip the initial load — the browser already announces the first title.
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const id = window.setTimeout(() => {
      setMessage(document.title);
    }, 150);
    return () => window.clearTimeout(id);
  }, [pathname]);

  return (
    <div aria-live='polite' aria-atomic='true' className='sr-only'>
      {message}
    </div>
  );
}
