'use client';

import type { ReactNode } from 'react';

export interface ChartColumn<T> {
  header: string;
  render: (row: T) => string | number;
}

interface ChartFigureProps<T> {
  ariaLabel: string;
  rows: T[];
  columns: ChartColumn<T>[];
  rowKey: (row: T, index: number) => string;
  children: ReactNode;
}

/**
 * Wraps a Recharts visual with an SR-only data table so screen reader
 * users get the actual numbers rather than a single aria-label sentence.
 * The visual is marked `aria-hidden` because Recharts tooltips aren't
 * keyboard accessible — the table is the canonical text representation.
 */
export function ChartFigure<T>({
  ariaLabel,
  rows,
  columns,
  rowKey,
  children,
}: ChartFigureProps<T>) {
  return (
    <figure aria-label={ariaLabel} className='m-0'>
      <div aria-hidden='true'>{children}</div>
      {/* `sr-only` on a wrapping div reliably clips the table; applied
          directly to <table>, the intrinsic table-layout width can leak
          past the 1px constraint and stretch the page on mobile. */}
      <div className='sr-only'>
        <table>
          <caption>{ariaLabel}</caption>
          <thead>
            <tr>
              {columns.map(c => (
                <th key={c.header} scope='col'>
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={rowKey(row, i)}>
                {columns.map(c => (
                  <td key={c.header}>{c.render(row)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}
