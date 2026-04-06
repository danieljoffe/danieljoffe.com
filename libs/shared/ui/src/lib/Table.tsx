'use client';

import type { KeyboardEvent, ReactNode } from 'react';
import { Text } from './Text';
import { cn } from './utils/cn';

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => ReactNode;
  align?: 'left' | 'center' | 'right';
  width?: string;
}

export interface TableProps<T> {
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
      className={cn(
        'w-full overflow-x-auto border border-border rounded-xl',
        className
      )}
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
            {columns.map(col => (
              <th
                key={col.key}
                scope='col'
                className={cn(
                  'px-4 py-3 font-medium text-text-secondary',
                  alignClass[col.align || 'left']
                )}
                style={col.width ? { width: col.width } : undefined}
              >
                {col.header}
              </th>
            ))}
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
                    'cursor-pointer hover:bg-surface-secondary focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent',
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
