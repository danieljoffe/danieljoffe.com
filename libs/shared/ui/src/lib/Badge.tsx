import { type HTMLAttributes, type ReactNode, type Ref } from 'react';
import type { ComponentSize } from './types';
import { cn } from './utils';

export type BadgeVariant =
  | 'default'
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
  ref?: Ref<HTMLSpanElement> | undefined;
  children: ReactNode;
  variant?: BadgeVariant;
  size?: ComponentSize;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-surface-elevated text-text-secondary border border-border',
  success: 'bg-success-light text-success border border-success/30',
  warning: 'bg-warning-light text-warning border border-warning/30',
  error: 'bg-error-light text-error border border-error/30',
  info: 'bg-info-light text-info border border-info/30',
  brand: 'bg-brand-50 text-brand-700',
  'brand-solid': 'bg-brand-600 text-white',
};

const sizeStyles: Record<ComponentSize, string> = {
  sm: 'px-1.5 py-0.5 text-[10px]',
  md: 'px-2.5 py-0.5 text-xs',
  lg: 'px-3 py-1 text-sm',
};

export function Badge({
  children,
  variant = 'default',
  size = 'md',
  className,
  ref,
  ...props
}: BadgeProps) {
  return (
    <span
      ref={ref}
      className={cn(
        'inline-flex items-center rounded-md font-medium',
        sizeStyles[size],
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
