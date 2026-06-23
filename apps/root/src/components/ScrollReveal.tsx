'use client';

import { useEffect } from 'react';

/**
 * Drives the scroll-reveal effect for elements tagged with `.reveal` or
 * `.reveal-stagger` (see the reveal rules in `styles/theme.css`).
 *
 * Renders nothing — it attaches an IntersectionObserver that adds `.is-visible`
 * as elements enter the viewport, which triggers the CSS transition. Using an
 * observer (rather than CSS `animation-timeline`) means the effect works in
 * every modern browser, including Safari and Firefox.
 *
 * Respects `prefers-reduced-motion`: when reduced motion is requested it bails
 * out entirely and the inline layout script never hides anything, so all
 * content stays visible and static.
 */
export function ScrollReveal() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    // Belt-and-suspenders: the inline layout script normally arms this before
    // first paint; re-assert it here in case that script was stripped.
    document.documentElement.classList.add('reveal-ready');

    const observer = new IntersectionObserver(
      (entries, obs) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const el = entry.target as HTMLElement;

          if (el.classList.contains('reveal-stagger')) {
            Array.from(el.children).forEach((child, i) => {
              (child as HTMLElement).style.transitionDelay =
                `${Math.min(i, 8) * 80}ms`;
              child.classList.add('is-visible');
            });
          } else {
            el.classList.add('is-visible');
          }

          obs.unobserve(el);
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.15 }
    );

    const targets = document.querySelectorAll('.reveal, .reveal-stagger');
    targets.forEach(el => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  return null;
}
