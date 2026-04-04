import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { cn } from './utils';

type TextElement = 'p' | 'span' | 'div' | 'label';

export type TextVariant =
  | 'body'
  | 'bodyLg'
  | 'cardDescription'
  | 'label'
  | 'meta'
  | 'caption'
  | 'helper'
  | 'error';

export interface TextProps
  extends Omit<HTMLAttributes<HTMLElement>, 'children'> {
  as?: TextElement;
  variant: TextVariant;
  children: ReactNode;
}

const variantStyles: Record<TextVariant, string> = {
  body: 'text-sm text-text-secondary leading-relaxed',
  bodyLg: 'text-base text-text-secondary leading-relaxed',
  cardDescription: 'text-sm text-text-secondary leading-relaxed',
  label:
    'text-xs font-semibold uppercase tracking-wider text-text-tertiary',
  meta: 'text-xs text-text-tertiary',
  caption: 'text-sm text-text-tertiary',
  helper: 'text-sm text-text-tertiary',
  error: 'text-sm text-error',
};

const defaultElement: Record<TextVariant, TextElement> = {
  body: 'p',
  bodyLg: 'p',
  cardDescription: 'p',
  label: 'span',
  meta: 'span',
  caption: 'p',
  helper: 'p',
  error: 'p',
};

export const Text = forwardRef<HTMLElement, TextProps>(
  ({ as, variant, className, children, ...props }, ref) => {
    const Tag = as ?? defaultElement[variant];
    return (
      <Tag
        ref={ref as React.Ref<never>}
        className={cn(variantStyles[variant], className)}
        {...props}
      >
        {children}
      </Tag>
    );
  }
);
Text.displayName = 'Text';
