import { type HTMLAttributes, type ReactNode, type Ref } from 'react';
import { cn } from './utils';

type HeadingLevel = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p';

export type HeadingVariant = 'section' | 'cardTitle' | 'component';

export interface HeadingProps extends Omit<
  HTMLAttributes<HTMLHeadingElement>,
  'children'
> {
  ref?: Ref<HTMLHeadingElement> | undefined;
  as?: HeadingLevel;
  variant: HeadingVariant;
  children: ReactNode;
}

const variantStyles: Record<HeadingVariant, string> = {
  section: 'text-2xl sm:text-3xl font-bold text-text-primary tracking-tight',
  cardTitle: 'text-sm font-semibold text-text-primary',
  component: 'text-lg font-semibold text-text-primary',
};

const defaultLevel: Record<HeadingVariant, HeadingLevel> = {
  section: 'h2',
  cardTitle: 'h3',
  component: 'h3',
};

export function Heading({
  as,
  variant,
  className,
  children,
  ref,
  ...props
}: HeadingProps) {
  const Tag = as ?? defaultLevel[variant];
  return (
    <Tag ref={ref} className={cn(variantStyles[variant], className)} {...props}>
      {children}
    </Tag>
  );
}
