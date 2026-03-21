import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from './utils';

type ProgressBarVariant = 'accent' | 'success' | 'warning' | 'error' | 'info';
type ProgressBarSize = 'sm' | 'md' | 'lg';

export interface ProgressBarProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'className'
> {
  value: number;
  max?: number;
  variant?: ProgressBarVariant;
  size?: ProgressBarSize;
  showLabel?: boolean;
  className?: string;
}

const variantStyles: Record<ProgressBarVariant, string> = {
  accent: 'bg-brand-500',
  success: 'bg-success',
  warning: 'bg-warning',
  error: 'bg-error',
  info: 'bg-info',
};

const sizeStyles: Record<ProgressBarSize, string> = {
  sm: 'h-1',
  md: 'h-2',
  lg: 'h-3',
};

export const ProgressBar = forwardRef<HTMLDivElement, ProgressBarProps>(
  (
    {
      value,
      max = 100,
      variant = 'accent',
      size = 'md',
      showLabel = false,
      className,
      'aria-label': ariaLabel = 'Progress',
      ...props
    },
    ref
  ) => {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

    return (
      <div ref={ref} className='w-full' {...props}>
        <div
          role='progressbar'
          aria-valuenow={Math.round(percentage)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={ariaLabel}
          className={cn(
            'w-full bg-surface-elevated rounded-full overflow-hidden',
            sizeStyles[size],
            className
          )}
        >
          <div
            className={cn(
              'h-full transition-all duration-300 ease-out',
              variantStyles[variant]
            )}
            style={{ width: `${percentage}%` }}
          />
        </div>
        {showLabel && (
          <p
            className='mt-1.5 text-sm text-text-secondary text-right'
            aria-hidden='true'
          >
            {Math.round(percentage)}%
          </p>
        )}
      </div>
    );
  }
);
ProgressBar.displayName = 'ProgressBar';
