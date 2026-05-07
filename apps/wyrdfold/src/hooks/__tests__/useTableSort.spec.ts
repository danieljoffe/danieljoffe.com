import { act, renderHook } from '@testing-library/react';
import { useTableSort } from '../useTableSort';

type Column = 'name' | 'date' | 'score';

describe('useTableSort', () => {
  it('initializes with the provided default column and desc order', () => {
    const { result } = renderHook(() => useTableSort<Column>('name'));

    expect(result.current.sort).toBe('name');
    expect(result.current.order).toBe('desc');
  });

  it('toggles order when the same column is sorted again', () => {
    const { result } = renderHook(() => useTableSort<Column>('name'));

    act(() => result.current.handleSort('name'));
    expect(result.current.order).toBe('asc');

    act(() => result.current.handleSort('name'));
    expect(result.current.order).toBe('desc');
  });

  it('switches column and resets order to desc when a different column is sorted', () => {
    const { result } = renderHook(() => useTableSort<Column>('name'));

    act(() => result.current.handleSort('name'));
    // flipped to asc
    expect(result.current.order).toBe('asc');

    act(() => result.current.handleSort('date'));
    expect(result.current.sort).toBe('date');
    expect(result.current.order).toBe('desc');
  });

  it('calls onSortChange each time handleSort fires', () => {
    const onSortChange = jest.fn();
    const { result } = renderHook(() =>
      useTableSort<Column>('name', onSortChange)
    );

    act(() => result.current.handleSort('name'));
    act(() => result.current.handleSort('date'));

    expect(onSortChange).toHaveBeenCalledTimes(2);
  });

  it('returns an arrow indicator only for the active column', () => {
    const { result } = renderHook(() => useTableSort<Column>('name'));

    expect(result.current.sortIndicator('name')).toBe(' ↓');
    expect(result.current.sortIndicator('date')).toBe('');

    act(() => result.current.handleSort('name'));
    expect(result.current.sortIndicator('name')).toBe(' ↑');
  });
});
