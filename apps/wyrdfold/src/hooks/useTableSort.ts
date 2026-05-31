import { useEffect, useState } from 'react';

export function useTableSort<T extends string>(
  defaultSort: T,
  onSortChange?: (sort: T, order: 'asc' | 'desc') => void,
  defaultOrder: 'asc' | 'desc' = 'desc',
  /** External source of truth (e.g. URL query params). When provided and
   *  it changes, the hook re-initialises ``sort``/``order`` from it. Used
   *  to wire browser back/forward to the table state. */
  controlled?: { sort: T; order: 'asc' | 'desc' }
) {
  const [sort, setSort] = useState<T>(controlled?.sort ?? defaultSort);
  const [order, setOrder] = useState<'asc' | 'desc'>(
    controlled?.order ?? defaultOrder
  );

  // Re-sync from the controlled value whenever it changes (e.g. user hit
  // browser back, URL flipped from ``sort=score`` to ``sort=title``).
  useEffect(() => {
    if (controlled) {
      setSort(controlled.sort);
      setOrder(controlled.order);
    }
  }, [controlled?.sort, controlled?.order, controlled]);

  function handleSort(column: T) {
    let nextSort: T;
    let nextOrder: 'asc' | 'desc';
    if (sort === column) {
      nextSort = sort;
      nextOrder = order === 'asc' ? 'desc' : 'asc';
    } else {
      nextSort = column;
      nextOrder = 'desc';
    }
    setSort(nextSort);
    setOrder(nextOrder);
    onSortChange?.(nextSort, nextOrder);
  }

  function sortIndicator(col: T) {
    return sort === col ? (order === 'asc' ? ' ↑' : ' ↓') : '';
  }

  return { sort, order, handleSort, sortIndicator } as const;
}
