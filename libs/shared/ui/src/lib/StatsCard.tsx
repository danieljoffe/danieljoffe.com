import { TrendingUp, TrendingDown } from 'lucide-react';
import type { ReactNode } from 'react';
import { Text } from './Text';
import { cn } from './utils/cn';

export interface StatsCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  /** Unit suffix appended after the change number. Defaults to '%'. */
  changeUnit?: string;
  /** When true, a negative change is treated as good (green). Useful for
   * metrics where lower is better — e.g. "avg days to response". */
  invertChange?: boolean;
  icon?: ReactNode;
  className?: string;
}

export function StatsCard({
  title,
  value,
  change,
  changeLabel,
  changeUnit = '%',
  invertChange = false,
  icon,
  className,
}: StatsCardProps) {
  const isPositiveDirection = change !== undefined && change >= 0;
  const isGood = invertChange ? !isPositiveDirection : isPositiveDirection;

  return (
    <div
      className={cn(
        'p-3 sm:p-6 bg-surface-elevated border border-border rounded-xl shadow-xs',
        className
      )}
    >
      <div className='flex items-start justify-between'>
        <div>
          <Text variant='caption'>{title}</Text>
          <Text
            variant='bodyLg'
            as='p'
            className='mt-1 sm:mt-1.5 text-lg sm:text-2xl font-semibold tracking-tight'
          >
            {value}
          </Text>
        </div>
        {icon && (
          <div className='p-2.5 bg-surface-tertiary rounded-lg text-text-secondary'>
            {icon}
          </div>
        )}
      </div>
      {change !== undefined && (
        <div className='mt-3 flex items-center gap-1.5 text-xs'>
          {isPositiveDirection ? (
            <TrendingUp
              className={cn(
                'h-3.5 w-3.5',
                isGood ? 'text-success' : 'text-error'
              )}
            />
          ) : (
            <TrendingDown
              className={cn(
                'h-3.5 w-3.5',
                isGood ? 'text-success' : 'text-error'
              )}
            />
          )}
          <span
            className={cn(
              'font-medium',
              isGood ? 'text-success' : 'text-error'
            )}
          >
            {isPositiveDirection ? '+' : ''}
            {change}
            {changeUnit}
          </span>
          {changeLabel && (
            <span className='text-text-tertiary'>{changeLabel}</span>
          )}
        </div>
      )}
    </div>
  );
}
