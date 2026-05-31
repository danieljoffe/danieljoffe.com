import { useCallback, useEffect, useState } from 'react';
import { useTableSort } from './useTableSort';

interface UseAdminTableFetchOptions<S extends string> {
  /** API endpoint path (e.g. '/api/audit/admin/scans') */
  endpoint: string;
  /** Default sort column */
  defaultSort: S;
  /** Default sort order */
  defaultOrder?: 'asc' | 'desc';
  /** Number of items per page */
  pageSize?: number;
  /** Key in the API response that holds the data array (e.g. 'scans', 'leads') */
  dataKey: string;
  /** Additional query params to include (e.g. filters) */
  extraParams?: Record<string, string>;
  /** External source of truth for sort/order/page (e.g. URL query params).
   *  When provided, the hook re-initialises its internal state any time
   *  the controlled value changes. Used so browser back/forward restores
   *  the table state without losing the filter bar. */
  controlled?:
    | {
        sort: S;
        order: 'asc' | 'desc';
        page: number;
      }
    | undefined;
  /** Fired whenever the user sorts. Lets the caller mirror the change
   *  into URL state so the back button restores it. */
  onSortChange?: ((sort: S, order: 'asc' | 'desc') => void) | undefined;
  /** Fired whenever the page changes (user click, sort reset, filter
   *  reset). Lets the caller mirror the change into URL state. */
  onPageChange?: ((page: number) => void) | undefined;
}

export function useAdminTableFetch<T, S extends string>({
  endpoint,
  defaultSort,
  defaultOrder,
  pageSize = 20,
  dataKey,
  extraParams,
  controlled,
  onSortChange,
  onPageChange,
}: UseAdminTableFetchOptions<S>) {
  const [data, setData] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPageState] = useState(controlled?.page ?? 1);
  const [loading, setLoading] = useState(true);

  // Re-sync the page from the controlled value (e.g. user hit browser
  // back from page 3 → page 1).
  useEffect(() => {
    if (controlled) setPageState(controlled.page);
  }, [controlled?.page, controlled]);

  // ``setPage`` flows through the URL callback (when provided) so the
  // pagination bar's click → state update → URL update is one path.
  const setPage = useCallback(
    (next: number) => {
      setPageState(next);
      onPageChange?.(next);
    },
    [onPageChange]
  );

  const { sort, order, handleSort, sortIndicator } = useTableSort<S>(
    defaultSort,
    (nextSort, nextOrder) => {
      setPageState(1);
      onPageChange?.(1);
      onSortChange?.(nextSort, nextOrder);
    },
    defaultOrder,
    controlled ? { sort: controlled.sort, order: controlled.order } : undefined
  );

  // Reset to page 1 whenever filters change. Without this, a user on page 2+
  // who types in the search box (or flips a status / score filter) keeps
  // ``offset = (page - 1) * pageSize`` from the prior view — most searches
  // narrow results so the new page is empty and the UI looks like the
  // search didn't fire. ``useTableSort`` already does this on sort change;
  // the filter path was the missing half. Serialize for the dep check so
  // we react to value changes, not just reference changes (useMemo in the
  // caller already gives a fresh ref on each filter change, but the
  // serialized check is robust either way).
  const extraParamsKey = JSON.stringify(extraParams ?? {});
  useEffect(() => {
    setPage(1);
  }, [extraParamsKey]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        sort,
        order,
        ...extraParams,
      });
      const res = await fetch(`${endpoint}?${params}`);
      if (res.ok) {
        const json = await res.json();
        setData(json[dataKey]);
        setTotal(json.total);
      }
    } finally {
      setLoading(false);
    }
  }, [endpoint, page, pageSize, sort, order, dataKey, extraParams]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalPages = Math.ceil(total / pageSize);

  return {
    data,
    loading,
    page,
    setPage,
    totalPages,
    sort,
    order,
    handleSort,
    sortIndicator,
    refetch: fetchData,
  } as const;
}
