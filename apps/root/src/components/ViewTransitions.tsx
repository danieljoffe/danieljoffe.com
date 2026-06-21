'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
} from 'react';
import { usePathname, useRouter } from 'next/navigation';

type NavigateFn = (href: string) => void;

type StartViewTransition = (callback: () => void | Promise<void>) => unknown;

const ViewTransitionContext = createContext<NavigateFn | null>(null);

/**
 * Returns a navigate function that wraps the App Router push in a browser
 * View Transition, so an element sharing a `view-transition-name` across the
 * two pages morphs between them. Falls back to a plain client push when the
 * browser lacks the API, the user prefers reduced motion, or the provider is
 * absent — callers never need to branch.
 *
 * Stable React (19.x) does not ship React's experimental `<ViewTransition>`
 * component, and Next's `experimental.viewTransition` flag only enables that
 * component — so we drive `document.startViewTransition()` directly instead.
 */
export function useViewTransitionNavigate(): NavigateFn {
  const router = useRouter();
  const navigate = useContext(ViewTransitionContext);
  return navigate ?? (href => router.push(href));
}

export function ViewTransitions({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  // Resolver for the in-flight transition's "new state is ready" promise.
  const finishRef = useRef<(() => void) | null>(null);

  // Once the new route commits, release the transition so the browser captures
  // the new DOM and runs the morph.
  useEffect(() => {
    finishRef.current?.();
    finishRef.current = null;
  }, [pathname]);

  const navigate = useCallback<NavigateFn>(
    href => {
      const startViewTransition = (
        document as unknown as { startViewTransition?: StartViewTransition }
      ).startViewTransition;
      const prefersReduced = window.matchMedia(
        '(prefers-reduced-motion: reduce)'
      ).matches;

      if (typeof startViewTransition !== 'function' || prefersReduced) {
        router.push(href);
        return;
      }

      startViewTransition.call(
        document,
        () =>
          new Promise<void>(resolve => {
            finishRef.current = resolve;
            router.push(href);
            // Safety net: never leave the page frozen if the route doesn't
            // change or the commit effect never fires.
            window.setTimeout(() => {
              if (finishRef.current === resolve) {
                finishRef.current = null;
                resolve();
              }
            }, 800);
          })
      );
    },
    [router]
  );

  return (
    <ViewTransitionContext.Provider value={navigate}>
      {children}
    </ViewTransitionContext.Provider>
  );
}
