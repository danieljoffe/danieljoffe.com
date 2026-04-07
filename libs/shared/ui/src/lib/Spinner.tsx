import { type HTMLAttributes, type Ref } from 'react';
import { cn } from './utils';

import type { ComponentSize } from './types';

type SpinnerVariant = 'accent';

export interface SpinnerProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'className' | 'role'
> {
  ref?: Ref<HTMLDivElement> | undefined;
  size?: ComponentSize;
  variant?: SpinnerVariant;
  className?: string;
}

const sizeStyles: Record<ComponentSize, string> = {
  sm: 'size-4 border-2',
  md: 'size-8 border-2',
  lg: 'size-12 border-3',
};

const variantStyles: Record<SpinnerVariant, string> = {
  accent: 'border-brand-500/30 border-t-accent',
};

export function Spinner({
  size = 'md',
  variant = 'accent',
  'aria-label': ariaLabel = 'Loading',
  className,
  ref,
  ...props
}: SpinnerProps) {
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
