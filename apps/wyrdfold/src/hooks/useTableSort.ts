import { useState } from 'react';

export function useTableSort<T extends string>(
  defaultSort: T,
  onSortChange?: () => void,
  defaultOrder: 'asc' | 'desc' = 'desc'
) {
  const [sort, setSort] = useState<T>(defaultSort);
  const [order, setOrder] = useState<'asc' | 'desc'>(defaultOrder);

  function handleSort(column: T) {
    if (sort === column) {
      setOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSort(column);
      setOrder('desc');
    }
    onSortChange?.();
  }

  function sortIndicator(col: T) {
    return sort === col ? (order === 'asc' ? ' ↑' : ' ↓') : '';
  }

  return { sort, order, handleSort, sortIndicator } as const;
}
