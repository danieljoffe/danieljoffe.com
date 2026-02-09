import { cn } from './utils';

type ProgressBarVariant = 'accent' | 'success' | 'warning' | 'error' | 'info';
type ProgressBarSize = 'sm' | 'md' | 'lg';

export interface ProgressBarProps {
  value: number;
  max?: number;
  variant?: ProgressBarVariant;
  size?: ProgressBarSize;
  showLabel?: boolean;
  className?: string;
  'aria-label'?: string;
}

const variantStyles: Record<ProgressBarVariant, string> = {
  accent: 'bg-accent',
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

export function ProgressBar({
  value,
  max = 100,
  variant = 'accent',
  size = 'md',
  showLabel = false,
  className,
  'aria-label': ariaLabel = 'Progress',
}: ProgressBarProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  return (
    <div className='w-full'>
      <div
        role='progressbar'
        aria-valuenow={Math.round(percentage)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={ariaLabel}
        className={cn(
          'w-full bg-background-elevated rounded-full overflow-hidden',
          sizeStyles[size],
          className
        )}
      >
        <div
          className={`h-full ${variantStyles[variant]} transition-all duration-300 ease-out`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showLabel && (
        <p
          className='mt-1.5 text-sm text-foreground-muted text-right'
          aria-hidden='true'
        >
          {Math.round(percentage)}%
        </p>
      )}
    </div>
  );
}
