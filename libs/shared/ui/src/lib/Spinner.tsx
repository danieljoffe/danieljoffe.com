import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from './utils';

type SpinnerSize = 'sm' | 'md' | 'lg';
type SpinnerVariant =
  | 'accent'
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'foreground';

export interface SpinnerProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'className' | 'role'
> {
  size?: SpinnerSize;
  variant?: SpinnerVariant;
  className?: string;
}

const sizeStyles: Record<SpinnerSize, string> = {
  sm: 'size-4 border-2',
  md: 'size-8 border-2',
  lg: 'size-12 border-3',
};

const variantStyles: Record<SpinnerVariant, string> = {
  accent: 'border-accent/30 border-t-accent',
  success: 'border-success/30 border-t-success',
  warning: 'border-warning/30 border-t-warning',
  error: 'border-error/30 border-t-error',
  info: 'border-info/30 border-t-info',
  foreground: 'border-foreground-subtle/30 border-t-foreground',
};

export const Spinner = forwardRef<HTMLDivElement, SpinnerProps>(
  (
    {
      size = 'md',
      variant = 'accent',
      'aria-label': ariaLabel = 'Loading',
      className,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        role='status'
        aria-label={ariaLabel}
        className={cn(
          'inline-block rounded-full animate-spin',
          sizeStyles[size],
          variantStyles[variant],
          className
        )}
        {...props}
      />
    );
  }
);
Spinner.displayName = 'Spinner';
