import { type HTMLAttributes, type ReactNode, type Ref } from 'react';
import { cn } from './utils';

type TextElement = 'p' | 'span' | 'div' | 'label';

export type TextVariant =
  | 'body'
  | 'bodyLg'
  | 'subtitle'
  | 'cardDescription'
  | 'detail'
  | 'label'
  | 'meta'
  | 'caption'
  | 'helper'
  | 'error';

export interface TextProps extends Omit<
  HTMLAttributes<HTMLElement>,
  'children'
> {
  ref?: Ref<HTMLElement> | undefined;
  as?: TextElement;
  variant: TextVariant;
  children: ReactNode;
}

const variantStyles: Record<TextVariant, string> = {
  body: 'text-sm text-text-secondary leading-relaxed',
  bodyLg: 'text-base text-text-secondary leading-relaxed',
  subtitle: 'text-lg text-text-secondary leading-relaxed',
  cardDescription: 'text-sm text-text-secondary leading-relaxed',
  detail: 'text-xs text-text-secondary',
  label: 'text-xs font-semibold uppercase tracking-wider text-text-tertiary',
  meta: 'text-xs text-text-tertiary',
  caption: 'text-sm text-text-tertiary',
  helper: 'text-sm text-text-tertiary',
  error: 'text-sm text-error',
};

const defaultElement: Record<TextVariant, TextElement> = {
  body: 'p',
  bodyLg: 'p',
  subtitle: 'p',
  cardDescription: 'p',
  detail: 'p',
  label: 'span',
  meta: 'span',
  caption: 'p',
  helper: 'p',
  error: 'p',
};

export function Text({
  as,
  variant,
  className,
  children,
  ref,
  ...props
}: TextProps) {
  const Tag = as ?? defaultElement[variant];
  return (
    <Tag
      ref={ref as Ref<never>}
      className={cn(variantStyles[variant], className)}
      {...props}
    >
      {children}
    </Tag>
  );
}
