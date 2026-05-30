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
}

export function useAdminTableFetch<T, S extends string>({
  endpoint,
  defaultSort,
  defaultOrder,
  pageSize = 20,
  dataKey,
  extraParams,
}: UseAdminTableFetchOptions<S>) {
  const [data, setData] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const { sort, order, handleSort, sortIndicator } = useTableSort<S>(
    defaultSort,
    () => setPage(1),
    defaultOrder
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
