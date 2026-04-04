import {
  Heading as SharedHeading,
  type HeadingVariant as SharedHeadingVariant,
} from '@danieljoffe.com/shared-ui';
import { cn } from '@/lib/cn';

type HeadingLevel = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p';

type AppHeadingVariant =
  | 'hero'
  | 'detail'
  | 'subtitle'
  | 'mdxH1'
  | 'mdxH2'
  | 'mdxH3'
  | 'mdxH4';

export type HeadingVariant = SharedHeadingVariant | AppHeadingVariant;

const appVariantStyles: Record<AppHeadingVariant, string> = {
  hero: 'text-4xl sm:text-5xl font-bold text-text-primary tracking-tight leading-[1.1]',
  detail:
    'text-3xl sm:text-4xl lg:text-5xl font-bold text-text-primary tracking-tight',
  subtitle: 'text-2xl font-bold text-text-primary tracking-tight',
  mdxH1: 'text-2xl font-bold text-text-primary tracking-tight mb-6',
  mdxH2: 'text-lg font-semibold text-text-primary mt-12 mb-4 scroll-mt-20',
  mdxH3: 'text-sm font-semibold text-text-primary mt-8 mb-3 scroll-mt-20',
  mdxH4:
    'text-xs font-medium text-text-secondary mt-6 mb-2 uppercase tracking-wider',
};

const appDefaultLevel: Record<AppHeadingVariant, HeadingLevel> = {
  hero: 'h1',
  detail: 'h1',
  subtitle: 'h2',
  mdxH1: 'h1',
  mdxH2: 'h2',
  mdxH3: 'h3',
  mdxH4: 'h4',
};

const sharedVariants = new Set<string>(['section', 'cardTitle', 'component']);

type HeadingProps = {
  as?: HeadingLevel;
  variant: HeadingVariant;
  className?: string | undefined;
  id?: string | undefined;
  children: React.ReactNode;
};

export function Heading({
  as,
  variant,
  className,
  id,
  children,
}: HeadingProps) {
  if (sharedVariants.has(variant)) {
    return (
      <SharedHeading
        {...(as != null && { as })}
        variant={variant as SharedHeadingVariant}
        className={className}
        id={id}
      >
        {children}
      </SharedHeading>
    );
  }

  const appVariant = variant as AppHeadingVariant;
  const Tag = as ?? appDefaultLevel[appVariant];
  return (
    <Tag id={id} className={cn(appVariantStyles[appVariant], className)}>
      {children}
    </Tag>
  );
}
