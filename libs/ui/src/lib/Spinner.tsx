interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'accent' | 'success' | 'warning' | 'error' | 'info' | 'foreground';
  'aria-label'?: string;
}

export function Spinner({
  size = 'md',
  variant = 'accent',
  'aria-label': ariaLabel = 'Loading',
}: SpinnerProps) {
  const sizeStyles = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-2',
    lg: 'w-12 h-12 border-3',
  };

  const variantStyles = {
    accent: 'border-accent/30 border-t-accent',
    success: 'border-success/30 border-t-success',
    warning: 'border-warning/30 border-t-warning',
    error: 'border-error/30 border-t-error',
    info: 'border-info/30 border-t-info',
    foreground: 'border-foreground-subtle/30 border-t-foreground',
  };

  return (
    <div
      role='status'
      aria-label={ariaLabel}
      className={`inline-block ${sizeStyles[size]} ${variantStyles[variant]} rounded-full animate-spin`}
    />
  );
}
