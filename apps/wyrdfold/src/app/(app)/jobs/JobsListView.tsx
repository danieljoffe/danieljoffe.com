'use client';

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import dynamic from 'next/dynamic';
import { useAdminTableFetch } from '@/hooks/useAdminTableFetch';
import JobsFilter from './JobsFilter';
import JobsListMobile from './JobsListMobile';
import JobsTableSkeleton from './JobsTableSkeleton';
import type { JobPosting, JobsFilterState, JobsSortColumn } from './types';

// Desktop table is heavier (inline expand panel, full table layout, recharts-free
// but still pulls JobDetailPanel + history). Phones never need it — load only
// when the viewport is md+.
const JobsListTable = dynamic(() => import('./JobsListTable'), {
  ssr: false,
  loading: () => <JobsTableSkeleton />,
});

// Was `(min-width: 768px)` — at tablet the 7-column table cramps the Title
// column to a single word per line ("Software / Engineer, / Product / ...").
// Bumping the breakpoint to lg (1024px+) keeps tablet on the mobile card
// pattern, which scales cleanly across the 768–1023 range. (Phase 4b #12.)
const DESKTOP_QUERY = '(min-width: 1024px)';

function subscribeMedia(callback: () => void): () => void {
  const mq = window.matchMedia(DESKTOP_QUERY);
  mq.addEventListener('change', callback);
  return () => mq.removeEventListener('change', callback);
}

function getIsDesktop(): boolean {
  return window.matchMedia(DESKTOP_QUERY).matches;
}

function useIsDesktop(): boolean {
  return useSyncExternalStore(
    subscribeMedia,
    getIsDesktop,
    () => false // SSR / hydration default — render mobile shell, swap on client
  );
}

interface JobsListViewProps {
  filters: JobsFilterState;
  onFiltersChange: (f: JobsFilterState) => void;
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  refreshKey: number;
  /** Active tab target — drives the jobs list filter. */
  targetId: string | undefined;
  /** Target to analyze each job against in the expand panel — falls
   *  back to the user's first active target so analysis still runs on
   *  the "All Jobs" tab. */
  analysisTargetId: string | undefined;
  onPostingsLoaded?: ((postings: JobPosting[]) => void) | undefined;
}

export default function JobsListView({
  filters,
  onFiltersChange,
  selectedIds,
  onSelectionChange,
  refreshKey,
  targetId,
  analysisTargetId,
  onPostingsLoaded,
}: JobsListViewProps) {
  const [deleteKey, setDeleteKey] = useState(0);
  const isDesktop = useIsDesktop();
  // ``useIsDesktop`` returns the server snapshot (false) during the first
  // client render to avoid hydration mismatch, which forces a flash of
  // ``JobsListMobile`` for desktop users before the matchMedia resolves.
  // Gate the layout pick behind a one-tick effect so the first render shows
  // the neutral table skeleton (matching the route loading.tsx) instead of
  // committing to a mobile layout we'll immediately swap away from.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(true);
  }, []);

  const extraParams = useMemo(() => {
    const params: Record<string, string> = {};
    if (targetId) params.target_id = targetId;
    if (filters.minScore) params.min_score = filters.minScore;
    if (filters.status) params.status = filters.status;
    if (filters.search) params.search = filters.search;
    const combined = refreshKey + deleteKey;
    if (combined) params._r = String(combined);
    return params;
  }, [targetId, filters, refreshKey, deleteKey]);

  const {
    data: postings,
    loading,
    page,
    setPage,
    totalPages,
    sort,
    order,
    handleSort,
    sortIndicator,
    refetch,
  } = useAdminTableFetch<JobPosting, JobsSortColumn>({
    endpoint: '/api/jobs',
    defaultSort: 'score',
    defaultOrder: 'desc',
    pageSize: 20,
    dataKey: 'postings',
    extraParams,
  });

  useEffect(() => {
    onPostingsLoaded?.(postings);
  }, [postings, onPostingsLoaded]);

  function handleRefetch() {
    setDeleteKey(k => k + 1);
    refetch();
  }

  return (
    <div className='flex flex-col gap-4'>
      <JobsFilter
        filters={filters}
        onChange={onFiltersChange}
        sort={sort}
        order={order}
        handleSort={handleSort}
      />
      {!hydrated ? (
        <JobsTableSkeleton />
      ) : isDesktop ? (
        <JobsListTable
          postings={postings}
          loading={loading}
          page={page}
          setPage={setPage}
          totalPages={totalPages}
          sort={sort}
          order={order}
          handleSort={handleSort}
          sortIndicator={sortIndicator}
          selectedIds={selectedIds}
          onSelectionChange={onSelectionChange}
          analysisTargetId={analysisTargetId}
          onRefetch={handleRefetch}
        />
      ) : (
        <JobsListMobile
          postings={postings}
          loading={loading}
          page={page}
          setPage={setPage}
          totalPages={totalPages}
          selectedIds={selectedIds}
          onSelectionChange={onSelectionChange}
          onRefetch={handleRefetch}
        />
      )}
    </div>
  );
}
