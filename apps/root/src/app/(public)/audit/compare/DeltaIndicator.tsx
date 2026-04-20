import { ArrowUp, ArrowDown, Minus } from 'lucide-react';
import type { Delta } from './calcDelta';

interface DeltaIndicatorProps {
  delta: Delta;
  formatValue: (n: number) => string;
  className?: string | undefined;
}

export default function DeltaIndicator({
  delta,
  formatValue,
  className,
}: DeltaIndicatorProps) {
  if (delta.direction === 'unknown' || delta.delta === null) {
    return (
      <span
        className={`inline-flex items-center gap-1 text-sm text-text-secondary tabular-nums ${className ?? ''}`}
        aria-label='No comparison available'
      >
        <Minus className='size-4' aria-hidden='true' />
        N/A
      </span>
    );
  }

  if (delta.direction === 'unchanged') {
    return (
      <span
        className={`inline-flex items-center gap-1 text-sm text-text-secondary tabular-nums ${className ?? ''}`}
        aria-label='Unchanged'
      >
        <Minus className='size-4' aria-hidden='true' />
        {formatValue(0)}
      </span>
    );
  }

  const isImproved = delta.direction === 'improved';
  const color = isImproved ? 'text-success' : 'text-error';
  const Icon = delta.delta > 0 ? ArrowUp : ArrowDown;
  const sign = delta.delta > 0 ? '+' : '';
  const label = isImproved
    ? `Improved by ${formatValue(Math.abs(delta.delta))}`
    : `Regressed by ${formatValue(Math.abs(delta.delta))}`;

  return (
    <span
      className={`inline-flex items-center gap-1 text-sm font-medium tabular-nums ${color} ${className ?? ''}`}
      aria-label={label}
    >
      <Icon className='size-4' aria-hidden='true' />
      {sign}
      {formatValue(delta.delta)}
    </span>
  );
}
