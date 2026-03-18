'use client';

import { TrendingUp, TrendingDown } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from './utils/cn';

export interface StatsCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: ReactNode;
  className?: string;
}

export function StatsCard({
  title,
  value,
  change,
  changeLabel,
  icon,
  className,
}: StatsCardProps) {
  const isPositive = change !== undefined && change >= 0;

  return (
    <div
      className={cn(
        'p-5 bg-surface-elevated border border-border rounded-xl shadow-xs',
        className
      )}
    >
      <div className='flex items-start justify-between'>
        <div>
          <p className='text-sm text-text-secondary'>{title}</p>
          <p className='mt-1.5 text-2xl font-semibold text-text-primary tracking-tight'>
            {value}
          </p>
        </div>
        {icon && (
          <div className='p-2.5 bg-surface-tertiary rounded-lg text-text-secondary'>
            {icon}
          </div>
        )}
      </div>
      {change !== undefined && (
        <div className='mt-3 flex items-center gap-1.5 text-xs'>
          {isPositive ? (
            <TrendingUp className='h-3.5 w-3.5 text-success' />
          ) : (
            <TrendingDown className='h-3.5 w-3.5 text-error' />
          )}
          <span
            className={cn(
              'font-medium',
              isPositive ? 'text-success' : 'text-error'
            )}
          >
            {isPositive ? '+' : ''}
            {change}%
          </span>
          {changeLabel && (
            <span className='text-text-tertiary'>{changeLabel}</span>
          )}
        </div>
      )}
    </div>
  );
}
