import { useState } from 'react';

export function useTableSort<T extends string>(
  defaultSort: T,
  onSortChange?: () => void
) {
  const [sort, setSort] = useState<T>(defaultSort);
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');

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
