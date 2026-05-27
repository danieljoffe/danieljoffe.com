import { type HTMLAttributes, type ReactNode, type Ref } from 'react';
import { Heading } from './Heading';
import { cn } from './utils';

type CardPadding = 'none' | 'sm' | 'md' | 'lg';

export interface CardProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'children'
> {
  ref?: Ref<HTMLDivElement> | undefined;
  children: ReactNode;
  elevated?: boolean;
  padding?: CardPadding;
}

export interface CardHeaderProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'children'
> {
  ref?: Ref<HTMLDivElement> | undefined;
  children: ReactNode;
}

export interface CardTitleProps extends Omit<
  HTMLAttributes<HTMLHeadingElement>,
  'children'
> {
  ref?: Ref<HTMLHeadingElement> | undefined;
  children: ReactNode;
  /**
   * Override the rendered heading level. Defaults to ``h3`` (the
   * underlying ``Heading variant='cardTitle'`` default). Pass ``h2``
   * when a CardTitle is the first heading inside an ``h1``-titled
   * page section — otherwise Lighthouse's ``heading-order`` audit
   * flags the h1→h3 jump as a screen-reader hazard.
   */
  as?: 'h2' | 'h3' | 'h4';
}

export interface CardContentProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'children'
> {
  ref?: Ref<HTMLDivElement> | undefined;
  children: ReactNode;
}

export interface CardFooterProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'children'
> {
  ref?: Ref<HTMLDivElement> | undefined;
  children: ReactNode;
}

const paddingStyles: Record<CardPadding, string> = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

export function Card({
  children,
  className,
  elevated = false,
  padding = 'md',
  ref,
  ...props
}: CardProps) {
  return (
    <div
      ref={ref}
      className={cn(
        'rounded-lg border border-border',
        elevated
          ? 'bg-surface-elevated shadow-md shadow-black/10 border-border-secondary'
          : 'bg-surface-elevated',
        paddingStyles[padding],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  children,
  className,
  ref,
  ...props
}: CardHeaderProps) {
  return (
    <div ref={ref} className={cn('mb-4', className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({
  children,
  className,
  ref,
  as,
  ...props
}: CardTitleProps) {
  // ``exactOptionalPropertyTypes`` requires we omit ``as`` when undefined
  // rather than passing ``as={undefined}`` (which doesn't satisfy
  // ``HeadingLevel`` without ``undefined`` in its union).
  return (
    <Heading
      ref={ref}
      variant='cardTitle'
      className={className}
      {...(as ? { as } : {})}
      {...props}
    >
      {children}
    </Heading>
  );
}

export function CardContent({
  children,
  className,
  ref,
  ...props
}: CardContentProps) {
  return (
    <div ref={ref} className={cn(className)} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({
  children,
  className,
  ref,
  ...props
}: CardFooterProps) {
  return (
    <div
      ref={ref}
      className={cn('mt-4 flex items-center gap-2', className)}
      {...props}
    >
      {children}
    </div>
  );
}
