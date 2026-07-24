import { type HTMLAttributes, type Ref } from 'react';
import { Text } from './Text';
import type { ComponentSize } from './types';
import { cn } from './utils';

type ProgressBarVariant = 'accent' | 'success' | 'warning' | 'error';

export interface ProgressBarProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'className'
> {
  ref?: Ref<HTMLDivElement> | undefined;
  value: number;
  max?: number;
  variant?: ProgressBarVariant;
  size?: ComponentSize;
  showLabel?: boolean;
  className?: string;
}

const variantStyles: Record<ProgressBarVariant, string> = {
  accent: 'bg-brand-500',
  success: 'bg-success',
  warning: 'bg-warning',
  error: 'bg-error',
};

const sizeStyles: Record<ComponentSize, string> = {
  sm: 'h-1',
  md: 'h-2',
  lg: 'h-3',
};

export function ProgressBar({
  value,
  max = 100,
  variant = 'accent',
  size = 'md',
  showLabel = false,
  className,
  'aria-label': ariaLabel = 'Progress',
  ref,
  ...props
}: ProgressBarProps) {
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
            'h-full transition-all duration-300 ease-out motion-reduce:transition-none',
            variantStyles[variant]
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showLabel && (
        <Text
          variant='caption'
          className='mt-1.5 text-right'
          aria-hidden='true'
        >
          {Math.round(percentage)}%
        </Text>
      )}
    </div>
  );
}
