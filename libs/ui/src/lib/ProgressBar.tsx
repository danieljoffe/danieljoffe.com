interface ProgressBarProps {
  value: number;
  max?: number;
  variant?: 'accent' | 'success' | 'warning' | 'error' | 'info';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export function ProgressBar({
  value,
  max = 100,
  variant = 'accent',
  size = 'md',
  showLabel = false,
  className = '',
}: ProgressBarProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  const variantStyles = {
    accent: 'bg-accent',
    success: 'bg-success',
    warning: 'bg-warning',
    error: 'bg-error',
    info: 'bg-info',
  };

  const sizeStyles = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
  };

  return (
    <div className='w-full'>
      <div
        className={`w-full bg-background-elevated rounded-full overflow-hidden ${sizeStyles[size]} ${className}`}
      >
        <div
          className={`h-full ${variantStyles[variant]} transition-all duration-300 ease-out`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showLabel && (
        <p className='mt-1.5 text-sm text-foreground-muted text-right'>
          {Math.round(percentage)}%
        </p>
      )}
    </div>
  );
}
