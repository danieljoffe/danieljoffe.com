import { type HTMLAttributes, type Ref } from 'react';
import {
  SEMANTIC_SPINNER,
  type SemanticVariant,
} from './styles/semanticVariants';
import type { ComponentSize } from './types';
import { cn } from './utils';

type SpinnerVariant = 'accent' | SemanticVariant;

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

// The base ring sits at 30% opacity so the solid top-border arc reads as
// the rotating indicator. The previous version referenced ``border-t-accent``,
// but no ``--color-accent`` token is registered in either pyre or indigo theme
// (only ``--color-brand-*`` and the semantic colors are). That made the top
// border resolve to a fallback, so the donut appeared as a uniform light ring
// — visually indistinguishable from a static circle even while ``animate-spin``
// was running. Use the same brand color at full vs 30% opacity, matching the
// pattern used by ``SEMANTIC_SPINNER``.
const variantStyles: Record<SpinnerVariant, string> = {
  accent: 'border-brand-500/30 border-t-brand-500',
  ...SEMANTIC_SPINNER,
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
        'inline-block rounded-full animate-spin motion-reduce:animate-none',
        sizeStyles[size],
        variantStyles[variant],
        className
      )}
      {...props}
    />
  );
}
