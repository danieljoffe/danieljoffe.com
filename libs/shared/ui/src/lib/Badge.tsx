import type { ReactNode } from 'react';
import { cn } from './utils';

type BadgeVariant =
  | 'default'
  | 'accent'
  | 'success'
  | 'warning'
  | 'error'
  | 'info';

export interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-background-elevated text-foreground-muted border border-border',
  accent: 'bg-accent-muted text-accent border border-accent/30',
  success: 'bg-success-muted text-success border border-success/30',
  warning: 'bg-warning-muted text-warning border border-warning/30',
  error: 'bg-error-muted text-error border border-error/30',
  info: 'bg-info-muted text-info border border-info/30',
};

export function Badge({
  children,
  variant = 'default',
  className,
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium',
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
