import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import {
  SEMANTIC_BG_LIGHT,
  SEMANTIC_BORDER,
  SEMANTIC_TEXT,
  type SemanticVariant,
} from './styles/semanticVariants';
import { cn } from './utils';

export type BadgeVariant =
  | 'default'
  | 'accent'
  | SemanticVariant
  | 'brand'
  | 'brand-solid';

export interface BadgeProps extends Omit<
  HTMLAttributes<HTMLSpanElement>,
  'children'
> {
  children: ReactNode;
  variant?: BadgeVariant;
}

const semanticBadge = (v: SemanticVariant) =>
  `${SEMANTIC_BG_LIGHT[v]} ${SEMANTIC_TEXT[v]} border ${SEMANTIC_BORDER[v]}`;

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-surface-elevated text-text-secondary border border-border',
  accent: 'bg-brand-50 text-brand-500 border border-brand-500/30',
  success: semanticBadge('success'),
  warning: semanticBadge('warning'),
  error: semanticBadge('error'),
  info: semanticBadge('info'),
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
