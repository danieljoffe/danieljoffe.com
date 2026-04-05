'use client';

import type { ReactNode } from 'react';
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
}

export function Table<T extends Record<string, unknown>>({
  columns,
  data,
  onRowClick,
  striped = false,
  className,
}: TableProps<T>) {
  const alignClass = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  };

  return (
    <div
      className={cn(
        'w-full overflow-x-auto border border-border rounded-xl',
        className
      )}
    >
      <table className='w-full text-sm'>
        <thead>
          <tr className='border-b border-border bg-surface-secondary'>
            {columns.map(col => (
              <th
                key={col.key}
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
          {data.map((row, i) => (
            <tr
              key={i}
              onClick={() => onRowClick?.(row)}
              className={cn(
                'border-b border-border last:border-b-0 transition-colors',
                onRowClick && 'cursor-pointer hover:bg-surface-secondary',
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
          ))}
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
