import { type HTMLAttributes, type ReactNode, type Ref } from 'react';
import { cn } from './utils';

type HeadingLevel = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p';

export type HeadingVariant =
  | 'hero'
  | 'detail'
  | 'subtitle'
  | 'section'
  | 'cardTitle'
  | 'component'
  | 'mdxH1'
  | 'mdxH2'
  | 'mdxH3'
  | 'mdxH4';

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
  hero: 'text-4xl sm:text-5xl font-bold text-text-primary tracking-tight leading-[1.1]',
  detail:
    'text-3xl sm:text-4xl lg:text-5xl font-bold text-text-primary tracking-tight',
  subtitle: 'text-2xl font-bold text-text-primary tracking-tight',
  section: 'text-2xl sm:text-3xl font-bold text-text-primary tracking-tight',
  cardTitle: 'text-sm font-semibold text-text-primary',
  component: 'text-lg font-semibold text-text-primary',
  mdxH1: 'text-2xl font-bold text-text-primary tracking-tight mb-6',
  mdxH2: 'text-lg font-semibold text-text-primary mt-12 mb-4 scroll-mt-20',
  mdxH3: 'text-sm font-semibold text-text-primary mt-8 mb-3 scroll-mt-20',
  mdxH4:
    'text-xs font-medium text-text-secondary mt-6 mb-2 uppercase tracking-wider',
};

const defaultLevel: Record<HeadingVariant, HeadingLevel> = {
  hero: 'h1',
  detail: 'h1',
  subtitle: 'h2',
  section: 'h2',
  cardTitle: 'h3',
  component: 'h3',
  mdxH1: 'h1',
  mdxH2: 'h2',
  mdxH3: 'h3',
  mdxH4: 'h4',
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
