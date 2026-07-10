'use client';

import { ChevronDown, ChevronUp, ChevronsUpDown } from 'lucide-react';
import type { HTMLAttributes, KeyboardEvent, ReactNode, Ref } from 'react';
import { FOCUS_RING, FOCUS_RING_OFFSET } from './styles/formStyles';
import { Text } from './Text';
import { cn } from './utils/cn';

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => ReactNode;
  align?: 'left' | 'center' | 'right';
  width?: string;
  /** When true, the header becomes a sort control (aria-sort + click/keyboard). */
  sortable?: boolean;
}

export interface TableProps<T> extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'className'
> {
  ref?: Ref<HTMLDivElement> | undefined;
  columns: Column<T>[];
  data: T[];
  onRowClick?: (row: T) => void;
  striped?: boolean;
  className?: string;
  /** Visible caption rendered inside the table for accessibility */
  caption?: string;
  /** aria-label for the table (used when caption is not provided) */
  ariaLabel?: string;
  /** Function to derive a unique key from each row (avoids index keys) */
  rowKey?: (row: T) => string | number;
  /** Function to derive an accessible label for clickable rows */
  getRowAriaLabel?: (row: T) => string;
  /**
   * Controlled sort — the key of the currently-sorted column. Sorting is
   * controlled: the Table renders the aria-sort state and the header control,
   * but the consumer owns the sort order and re-sorts `data` in response to
   * `onSort`.
   */
  sortKey?: string;
  /** Controlled sort — direction of the current sort. */
  sortDirection?: 'asc' | 'desc';
  /** Called with a column's `key` when its sortable header is activated. */
  onSort?: (key: string) => void;
}

export function Table<T extends Record<string, unknown>>({
  columns,
  data,
  onRowClick,
  striped = false,
  className,
  caption,
  ariaLabel,
  rowKey,
  getRowAriaLabel,
  sortKey,
  sortDirection,
  onSort,
  ref,
  ...rest
}: TableProps<T>) {
  const alignClass = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  };

  const handleRowKeyDown = (e: KeyboardEvent<HTMLTableRowElement>, row: T) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onRowClick?.(row);
    }
  };

  return (
    <div
      ref={ref}
      className={cn(
        'w-full overflow-x-auto border border-border rounded-xl',
        className
      )}
      {...rest}
    >
      <table
        className='w-full text-sm'
        aria-label={!caption ? ariaLabel : undefined}
      >
        {caption && (
          <caption className='px-4 py-3 text-left text-sm font-medium text-text-secondary'>
            {caption}
          </caption>
        )}
        <thead>
          <tr className='border-b border-border bg-surface-secondary'>
            {columns.map(col => {
              const isSorted = Boolean(col.sortable) && sortKey === col.key;
              return (
                <th
                  key={col.key}
                  scope='col'
                  aria-sort={
                    col.sortable
                      ? isSorted
                        ? sortDirection === 'asc'
                          ? 'ascending'
                          : 'descending'
                        : 'none'
                      : undefined
                  }
                  className={cn(
                    'px-4 py-3 font-medium text-text-secondary',
                    alignClass[col.align || 'left']
                  )}
                  style={col.width ? { width: col.width } : undefined}
                >
                  {col.sortable ? (
                    <button
                      type='button'
                      onClick={() => onSort?.(col.key)}
                      className={cn(
                        'inline-flex items-center gap-1 rounded-sm font-medium cursor-pointer transition-colors hover:text-text-primary',
                        FOCUS_RING,
                        FOCUS_RING_OFFSET,
                        isSorted && 'text-text-primary'
                      )}
                    >
                      {col.header}
                      {isSorted ? (
                        sortDirection === 'asc' ? (
                          <ChevronUp
                            aria-hidden='true'
                            className='h-3.5 w-3.5'
                          />
                        ) : (
                          <ChevronDown
                            aria-hidden='true'
                            className='h-3.5 w-3.5'
                          />
                        )
                      ) : (
                        <ChevronsUpDown
                          aria-hidden='true'
                          className='h-3.5 w-3.5 text-text-tertiary'
                        />
                      )}
                    </button>
                  ) : (
                    col.header
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => {
            const key = rowKey ? rowKey(row) : i;
            return (
              <tr
                key={key}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                onKeyDown={
                  onRowClick ? e => handleRowKeyDown(e, row) : undefined
                }
                tabIndex={onRowClick ? 0 : undefined}
                role={onRowClick ? 'button' : undefined}
                aria-label={
                  onRowClick && getRowAriaLabel
                    ? getRowAriaLabel(row)
                    : undefined
                }
                className={cn(
                  'border-b border-border last:border-b-0 transition-colors',
                  onRowClick &&
                    'cursor-pointer hover:bg-surface-secondary focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand-500',
                  striped && i % 2 === 1 && 'bg-surface-secondary'
                )}
              >
                {columns.map(col => (
                  <td
                    key={col.key}
                    className={cn(
                      'px-4 py-3 text-text-primary',
                      alignClass[col.align || 'left']
                    )}
                  >
                    {col.render ? col.render(row) : (row[col.key] as ReactNode)}
                  </td>
                ))}
              </tr>
            );
          })}
          {data.length === 0 && (
            <tr>
              <td colSpan={columns.length} className='px-4 py-12 text-center'>
                <Text variant='caption' as='span'>
                  No data available
                </Text>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
