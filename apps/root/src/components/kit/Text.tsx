import {
  Text as SharedText,
  type TextVariant as SharedTextVariant,
} from '@danieljoffe.com/shared-ui';
import { cn } from '@/lib/cn';

type TextElement = 'p' | 'span' | 'div' | 'label';

type AppTextVariant = 'subtitle';

export type TextVariant = SharedTextVariant | AppTextVariant;

const appVariantStyles: Record<AppTextVariant, string> = {
  subtitle: 'text-lg text-text-secondary leading-relaxed',
};

const appDefaultElement: Record<AppTextVariant, TextElement> = {
  subtitle: 'p',
};

const sharedVariants = new Set<string>([
  'body',
  'bodyLg',
  'cardDescription',
  'label',
  'meta',
  'caption',
  'helper',
  'error',
]);

type TextProps = {
  as?: TextElement;
  variant: TextVariant;
  className?: string | undefined;
  id?: string | undefined;
  role?: string | undefined;
  children: React.ReactNode;
};

export function Text({
  as,
  variant,
  className,
  id,
  role,
  children,
}: TextProps) {
  if (sharedVariants.has(variant)) {
    return (
      <SharedText
        {...(as != null && { as })}
        variant={variant as SharedTextVariant}
        className={className}
        id={id}
        role={role}
      >
        {children}
      </SharedText>
    );
  }

  const appVariant = variant as AppTextVariant;
  const Tag = as ?? appDefaultElement[appVariant];
  return (
    <Tag
      id={id}
      role={role}
      className={cn(appVariantStyles[appVariant], className)}
    >
      {children}
    </Tag>
  );
}
