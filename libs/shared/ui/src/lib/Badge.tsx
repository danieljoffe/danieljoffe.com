import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { cn } from './utils';

export type BadgeVariant =
  | 'default'
  | 'accent'
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'brand'
  | 'brand-solid';

export interface BadgeProps extends Omit<
  HTMLAttributes<HTMLSpanElement>,
  'children'
> {
  children: ReactNode;
  variant?: BadgeVariant;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-surface-elevated text-text-secondary border border-border',
  accent: 'bg-brand-50 text-brand-500 border border-brand-500/30',
  success: 'bg-success-light text-success border border-success/30',
  warning: 'bg-warning-light text-warning border border-warning/30',
  error: 'bg-error-light text-error border border-error/30',
  info: 'bg-info-light text-info border border-info/30',
  brand: 'bg-brand-50 text-brand-700',
  'brand-solid': 'bg-brand-600 text-white',
};

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ children, variant = 'default', className, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium',
          variantStyles[variant],
          className
        )}
        {...props}
      >
        {children}
      </span>
    );
  }
);
Badge.displayName = 'Badge';
