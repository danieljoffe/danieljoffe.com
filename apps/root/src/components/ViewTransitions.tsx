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

type ViewTransitionLike = { finished?: Promise<unknown> };
type StartViewTransition = (
  callback: () => void | Promise<void>
) => ViewTransitionLike;

const ViewTransitionContext = createContext<NavigateFn | null>(null);

function getStartViewTransition(): StartViewTransition | undefined {
  const fn = (
    document as unknown as { startViewTransition?: StartViewTransition }
  ).startViewTransition;
  // Bind to `document`; calling the bare method throws "Illegal invocation".
  return typeof fn === 'function' ? fn.bind(document) : undefined;
}

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

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

  // Resolver for the in-flight transition's "new DOM is ready" promise.
  const finishRef = useRef<(() => void) | null>(null);
  // Back/forward morph: the shared name to re-apply to the destination card
  // once it renders, plus the element we applied it to (for cleanup after).
  const pendingNameRef = useRef<string | null>(null);
  const namedElRef = useRef<HTMLElement | null>(null);

  // Once the new route commits: for a back/forward morph, tag the destination
  // card with the shared name so it pairs with the hero we're leaving; then
  // release the transition so the browser captures the new state.
  useEffect(() => {
    if (!finishRef.current) return;
    const name = pendingNameRef.current;
    if (name) {
      const el = document.querySelector<HTMLElement>(
        `[data-cover-name="${CSS.escape(name)}"]`
      );
      if (el) {
        el.style.viewTransitionName = name;
        namedElRef.current = el;
      }
      pendingNameRef.current = null;
    }
    finishRef.current();
    finishRef.current = null;
  }, [pathname]);

  const beginTransition = useCallback(
    (start: StartViewTransition, href?: string) => {
      // Create the "new DOM is ready" promise and stash its resolver
      // *synchronously*, before the route can re-render. For a browser
      // traverse the App Router re-renders almost immediately, so resolving
      // inside the (async) startViewTransition callback would race the commit
      // effect and lose the morph.
      let resolveReady: () => void = () => undefined;
      const ready = new Promise<void>(resolve => {
        resolveReady = resolve;
      });
      finishRef.current = resolveReady;

      const transition = start(() => ready);

      // Forward nav drives the route change; back/forward leaves it to the
      // browser's own history navigation.
      if (href) router.push(href);

      // Safety net: never leave the page frozen if the route never changes or
      // the commit effect doesn't fire.
      window.setTimeout(() => {
        if (finishRef.current === resolveReady) {
          finishRef.current = null;
          resolveReady();
        }
      }, 800);

      // Once the morph finishes, drop the name we applied to the destination
      // card so the next transition starts clean.
      transition.finished
        ?.then(() => {
          namedElRef.current?.style.removeProperty('view-transition-name');
          namedElRef.current = null;
        })
        .catch(() => undefined);
    },
    [router]
  );

  const navigate = useCallback<NavigateFn>(
    href => {
      const start = getStartViewTransition();
      if (!start || prefersReducedMotion()) {
        router.push(href);
        return;
      }
      // Forward: the card has already named its own cover; push inside the
      // transition.
      beginTransition(start, href);
    },
    [beginTransition, router]
  );

  // Backward morph: browser back/forward off a detail page morphs the hero
  // back into the card it came from. `popstate` fires *after* the App Router
  // has already re-rendered (the old DOM is gone), so it can't snapshot the
  // hero. The Navigation API's `navigate` event fires *before* the re-render
  // while the detail DOM is still present, so we hook that instead — observe
  // only (no `intercept()`), letting Next perform the actual routing. Card
  // clicks are `push`/`replace`; only browser back/forward is `traverse`.
  // Chromium-only; elsewhere back/forward is a normal navigation.
  useEffect(() => {
    const navigation = (
      window as unknown as { navigation?: EventTarget | undefined }
    ).navigation;
    if (!navigation) return;

    const onNavigate = (event: Event) => {
      if (
        (event as { navigationType?: string }).navigationType !== 'traverse'
      ) {
        return;
      }
      const hero = document.querySelector<HTMLElement>('[data-vt-hero]');
      const name = hero?.getAttribute('data-vt-name') ?? null;
      const start = getStartViewTransition();
      if (!hero || !name || !start || prefersReducedMotion()) return;
      pendingNameRef.current = name;
      beginTransition(start);
    };

    navigation.addEventListener('navigate', onNavigate);
    return () => navigation.removeEventListener('navigate', onNavigate);
  }, [beginTransition]);

  return (
    <ViewTransitionContext.Provider value={navigate}>
      {children}
    </ViewTransitionContext.Provider>
  );
}
