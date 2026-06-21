'use client';

import { useEffect, useRef } from 'react';

/**
 * Decorative cursor-following glow for a card. Drop it inside a positioned,
 * `group` card (it fills the card via `absolute inset-0`); it tracks the
 * pointer over its parent and the `.card-spotlight` gradient (theme.css)
 * renders the glow, revealed on `group-hover`.
 *
 * Pure decoration: `pointer-events-none` + `aria-hidden`, and it does nothing
 * until the pointer moves over the card.
 */
export function CardSpotlight() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    const card = el?.parentElement;
    if (!el || !card) return;

    const onMove = (event: PointerEvent) => {
      const rect = card.getBoundingClientRect();
      el.style.setProperty('--spot-x', `${event.clientX - rect.left}px`);
      el.style.setProperty('--spot-y', `${event.clientY - rect.top}px`);
    };

    card.addEventListener('pointermove', onMove);
    return () => card.removeEventListener('pointermove', onMove);
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden='true'
      className='card-spotlight pointer-events-none absolute inset-0 z-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100'
    />
  );
}
