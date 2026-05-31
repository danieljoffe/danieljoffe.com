'use client';

import { useCallback, useMemo, useRef } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

/**
 * Single source of truth for which filters / sort / page / target the
 * /jobs page is showing. Reads from ``useSearchParams`` so browser
 * back/forward "just works" — pressing back re-runs the read-from-URL
 * effects and every consumer rehydrates from the new URL automatically.
 *
 * The setters all use ``router.replace`` (not ``push``) so typing in
 * the search box doesn't generate a history entry per keystroke. The
 * tab/page setters opt into ``push`` via the ``mode`` arg so they DO
 * create history entries — that's the affordance a user expects when
 * they navigate to page 2 and then hit back.
 *
 * Keys are kept short for URL hygiene: ``q`` (search), ``s`` (status),
 * ``score`` (minScore), ``sort``, ``order``, ``page``, ``target``.
 */

const KEYS = {
  search: 'q',
  status: 's',
  minScore: 'score',
  excludeLocations: 'exclude',
  onlyLocations: 'only',
  sort: 'sort',
  order: 'order',
  page: 'page',
  target: 'target',
} as const;

type JobsUrlOrder = 'asc' | 'desc';

interface JobsUrlState {
  search: string;
  status: string;
  minScore: string;
  excludeLocations: string;
  onlyLocations: string;
  sort: string;
  order: JobsUrlOrder;
  page: number;
  targetId: string | undefined;
}

/** Patch shape: pass only the keys you want to change. ``null`` clears
 *  the key. Omitted keys are left untouched. */
type JobsUrlPatch = Partial<{
  [K in keyof JobsUrlState]: JobsUrlState[K] | null;
}>;

interface UseJobsUrlStateOptions {
  /** What to set ``sort`` to when the URL doesn't specify one. */
  defaultSort: string;
  /** What to set ``order`` to when the URL doesn't specify one. */
  defaultOrder: JobsUrlOrder;
  /** Auto-pick a target tab when the URL has none. Used so a bare
   *  ``/jobs`` lands on the user's first active target rather than the
   *  empty "All Jobs" view (which the poller doesn't populate). */
  defaultTargetId?: string | undefined | null;
}

function parsePage(raw: string | null): number {
  const n = Number.parseInt(raw ?? '', 10);
  return Number.isFinite(n) && n >= 1 ? n : 1;
}

function parseOrder(raw: string | null): JobsUrlOrder {
  return raw === 'asc' ? 'asc' : 'desc';
}

export function useJobsUrlState({
  defaultSort,
  defaultOrder,
  defaultTargetId,
}: UseJobsUrlStateOptions): {
  state: JobsUrlState;
  setState: (patch: JobsUrlPatch, mode?: 'replace' | 'push') => void;
} {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  // Snapshot the latest searchParams so the setter callback (memoised on
  // ``pathname`` / ``router``) sees up-to-date values without retriggering
  // every component that consumes the hook on every keystroke.
  const paramsRef = useRef(searchParams);
  paramsRef.current = searchParams;

  const state = useMemo<JobsUrlState>(() => {
    const target = searchParams.get(KEYS.target);
    return {
      search: searchParams.get(KEYS.search) ?? '',
      status: searchParams.get(KEYS.status) ?? '',
      minScore: searchParams.get(KEYS.minScore) ?? '',
      excludeLocations: searchParams.get(KEYS.excludeLocations) ?? '',
      onlyLocations: searchParams.get(KEYS.onlyLocations) ?? '',
      sort: searchParams.get(KEYS.sort) ?? defaultSort,
      order: parseOrder(searchParams.get(KEYS.order)) ?? defaultOrder,
      page: parsePage(searchParams.get(KEYS.page)),
      targetId: target ?? defaultTargetId ?? undefined,
    };
  }, [searchParams, defaultSort, defaultOrder, defaultTargetId]);

  const setState = useCallback(
    (patch: JobsUrlPatch, mode: 'replace' | 'push' = 'replace') => {
      const next = new URLSearchParams(paramsRef.current.toString());
      const apply = (key: string, value: string | null | undefined) => {
        if (value === null || value === undefined || value === '') {
          next.delete(key);
        } else {
          next.set(key, value);
        }
      };
      if ('search' in patch) apply(KEYS.search, patch.search);
      if ('status' in patch) apply(KEYS.status, patch.status);
      if ('minScore' in patch) apply(KEYS.minScore, patch.minScore);
      if ('excludeLocations' in patch)
        apply(KEYS.excludeLocations, patch.excludeLocations);
      if ('onlyLocations' in patch)
        apply(KEYS.onlyLocations, patch.onlyLocations);
      if ('sort' in patch) apply(KEYS.sort, patch.sort);
      if ('order' in patch) apply(KEYS.order, patch.order);
      if ('page' in patch) {
        // Page 1 is the implicit default — drop it from the URL so the
        // canonical "no filters" URL is just ``/jobs``.
        if (patch.page === 1 || patch.page === null) {
          next.delete(KEYS.page);
        } else if (typeof patch.page === 'number') {
          next.set(KEYS.page, String(patch.page));
        }
      }
      if ('targetId' in patch) apply(KEYS.target, patch.targetId);

      const qs = next.toString();
      const url = qs ? `${pathname}?${qs}` : pathname;
      if (mode === 'push') {
        router.push(url, { scroll: false });
      } else {
        router.replace(url, { scroll: false });
      }
    },
    [pathname, router]
  );

  return { state, setState };
}
