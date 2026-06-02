'use client';

/**
 * Per-target filter persistence in localStorage.
 *
 * The /jobs page used to lose filter state any time the user navigated
 * away and returned via a link that didn't preserve the query string
 * (e.g. the sidebar's /jobs link, the dashboard's "view all" links).
 * URL was the SoT but the URL wasn't always carried back in.
 *
 * This hook layers localStorage on top: every time the URL filter
 * state changes, snapshot it into ``localStorage[wyrdfold.filters.<key>]``.
 * On entry — if the URL is bare AND a snapshot exists for the current
 * target — restore the snapshot into the URL via the caller's setter.
 *
 * Keyed per target so each target remembers its own filters. The All
 * Jobs view uses the ``__all__`` sentinel. Storage is keyed by
 * ``wyrdfold.filters.<targetId|__all__>`` and stores a JSON object
 * with the five persisted fields (search, status, minScore,
 * excludeLocations, onlyLocations). Sort/order/page/targetId are NOT
 * persisted — those are navigation state, not filter state.
 *
 * Failures (SSR, quota exceeded, disabled storage) are silent: read
 * returns ``null``, write becomes a no-op. The page works without
 * persistence; it just loses the convenience.
 */

import { useCallback } from 'react';

import type { JobsFilterState } from './types';

const STORAGE_PREFIX = 'wyrdfold.filters.';
const ALL_JOBS_KEY = '__all__';

function storageKey(targetId: string | undefined): string {
  return `${STORAGE_PREFIX}${targetId ?? ALL_JOBS_KEY}`;
}

/**
 * Normalize a parsed storage payload into a valid ``JobsFilterState``.
 * Returns ``null`` if the payload is malformed enough that no field is
 * recoverable — caller should fall back to the empty filter set.
 *
 * Per-field validation is permissive: a single bad field doesn't poison
 * the whole snapshot; we just drop that field. This matters for forward
 * compat — if a future version adds a filter field, the old snapshot
 * still partially restores.
 */
function coerce(raw: unknown): JobsFilterState | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const obj = raw as Record<string, unknown>;
  const str = (k: string): string =>
    typeof obj[k] === 'string' ? (obj[k] as string) : '';
  const out: JobsFilterState = {
    search: str('search'),
    status: str('status'),
    minScore: str('minScore'),
    excludeLocations: str('excludeLocations'),
    onlyLocations: str('onlyLocations'),
  };
  // If everything ended up empty there's nothing to restore — return
  // ``null`` so the caller knows to leave the URL alone.
  const allEmpty =
    !out.search &&
    !out.status &&
    !out.minScore &&
    !out.excludeLocations &&
    !out.onlyLocations;
  return allEmpty ? null : out;
}

interface JobsFilterPersistence {
  read: (targetId: string | undefined) => JobsFilterState | null;
  write: (targetId: string | undefined, filters: JobsFilterState) => void;
  clear: (targetId: string | undefined) => void;
}

export function useJobsFilterPersistence(): JobsFilterPersistence {
  const read = useCallback(
    (targetId: string | undefined): JobsFilterState | null => {
      if (typeof window === 'undefined') return null;
      try {
        const raw = window.localStorage.getItem(storageKey(targetId));
        if (!raw) return null;
        return coerce(JSON.parse(raw));
      } catch {
        // Malformed JSON, parser error, etc. — treat as missing.
        return null;
      }
    },
    []
  );

  const write = useCallback(
    (targetId: string | undefined, filters: JobsFilterState): void => {
      if (typeof window === 'undefined') return;
      try {
        // Drop the entry entirely when all fields are empty so a "clear
        // all filters" action doesn't leave a stale snapshot that would
        // re-apply on the next visit.
        const allEmpty =
          !filters.search &&
          !filters.status &&
          !filters.minScore &&
          !filters.excludeLocations &&
          !filters.onlyLocations;
        if (allEmpty) {
          window.localStorage.removeItem(storageKey(targetId));
          return;
        }
        window.localStorage.setItem(
          storageKey(targetId),
          JSON.stringify(filters)
        );
      } catch {
        // Quota exceeded / storage disabled — silent.
      }
    },
    []
  );

  const clear = useCallback((targetId: string | undefined): void => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.removeItem(storageKey(targetId));
    } catch {
      // ignore
    }
  }, []);

  return { read, write, clear };
}
