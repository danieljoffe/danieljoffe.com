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

/**
 * Navigate with a View Transition. `coverName` (optional) names the element on
 * the *destination* page that should morph in — used when the source is a
 * detail hero and the target is the matching list card (e.g. a breadcrumb
 * click back to the list). Forward card clicks omit it because the card has
 * already named its own cover.
 */
type NavigateFn = (href: string, coverName?: string) => void;

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
  // Breadcrumb morph: the shared name to apply to the destination card once it
  // renders, plus the element we applied it to (for cleanup after).
  const pendingNameRef = useRef<string | null>(null);
  const namedElRef = useRef<HTMLElement | null>(null);
  // Set for a breadcrumb morph: the destination card may sit far down the list,
  // so bring it into view before the new snapshot is captured.
  const recenterRef = useRef(false);

  // Once the new route commits: for a breadcrumb morph, tag the destination
  // card with the shared name so it pairs with the hero we're leaving; then
  // release the transition so the browser captures the new state.
  useEffect(() => {
    const resolve = finishRef.current;
    if (!resolve) return;
    // Claim the resolver so the safety timeout can't also fire it.
    finishRef.current = null;

    const name = pendingNameRef.current;
    pendingNameRef.current = null;
    const recenter = recenterRef.current;
    recenterRef.current = false;
    if (name) {
      const el = document.querySelector<HTMLElement>(
        `[data-cover-name="${CSS.escape(name)}"]`
      );
      if (el) {
        el.style.viewTransitionName = name;
        namedElRef.current = el;
        // The destination card may sit far down the list; bring it into view
        // so the new snapshot captures it on-screen — otherwise the morph would
        // target an off-screen position and animate out of sight.
        // `behavior: 'instant'` settles scroll + layout synchronously, so the
        // new snapshot (captured the moment we resolve) sees the final state.
        if (recenter) {
          el.scrollIntoView({ block: 'center', behavior: 'instant' });
        }
      }
    }

    // Resolve synchronously: the browser suppresses rendering while it waits
    // for this promise, so a requestAnimationFrame here would never fire and
    // the transition would hang until the browser force-aborts it.
    resolve();
  }, [pathname]);

  const beginTransition = useCallback(
    (start: StartViewTransition, href: string, scroll = true) => {
      // Create the "new DOM is ready" promise and stash its resolver
      // *synchronously*, before the route can re-render — so the commit effect
      // (which fires on the next pathname change) resolves the same promise.
      let resolveReady: () => void = () => undefined;
      const ready = new Promise<void>(resolve => {
        resolveReady = resolve;
      });
      finishRef.current = resolveReady;

      const transition = start(() => ready);

      // Drive the route change. `scroll: false` (breadcrumb) lets the commit
      // effect own scroll, so a recentered morph target isn't yanked to the top
      // of the destination before the snapshot is taken.
      router.push(href, { scroll });

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
    (href, coverName) => {
      const start = getStartViewTransition();
      if (!start || prefersReducedMotion()) {
        router.push(href);
        return;
      }
      // When a cover name is given (e.g. a breadcrumb morphing the hero back to
      // its list card), tag the destination card once the list renders, and
      // recenter it so the morph lands on-screen even when the card sits far
      // down the list. We own scroll (`scroll: false`) so Next doesn't yank the
      // page to the top before the new snapshot is captured. Forward card
      // clicks pass nothing — the card already named its own cover, and the
      // detail page should land at the top.
      if (coverName) {
        pendingNameRef.current = coverName;
        recenterRef.current = true;
        beginTransition(start, href, false);
        return;
      }
      beginTransition(start, href);
    },
    [beginTransition, router]
  );

  // Note: there's deliberately no browser back/forward morph. A traverse
  // commits the destination DOM before `startViewTransition` can snapshot the
  // old state, so it photographs the destination (nothing to morph). Driving
  // it correctly would require intercepting the Navigation API and owning the
  // route change, which fights Next's router — not worth it. Back/forward is a
  // normal instant navigation; the morph is a forward + breadcrumb enhancement.

  return (
    <ViewTransitionContext.Provider value={navigate}>
      {children}
    </ViewTransitionContext.Provider>
  );
}
