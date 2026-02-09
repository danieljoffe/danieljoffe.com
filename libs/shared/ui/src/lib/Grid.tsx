import type { ReactNode, ElementType, ComponentPropsWithoutRef } from 'react';
import { cn } from './utils';

type GridElement =
  | 'div'
  | 'ul'
  | 'ol'
  | 'section'
  | 'article'
  | 'aside'
  | 'main';

export interface GridProps<T extends GridElement = 'div'> {
  /** The HTML element to render as. Defaults to 'div'. Use 'ul' or 'ol' for semantic lists. */
  as?: T;
  children: ReactNode;
  cols?: 0 | 1 | 2 | 3 | 4 | 6 | 12;
  gap?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

type PolymorphicGridProps<T extends GridElement = 'div'> = GridProps<T> &
  Omit<ComponentPropsWithoutRef<T>, keyof GridProps<T>>;

const colClasses = {
  0: '',
  1: 'grid-cols-1',
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  6: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6',
  12: 'grid-cols-4 sm:grid-cols-6 lg:grid-cols-12',
};

const gapClasses = {
  none: 'gap-0',
  sm: 'gap-2 sm:gap-3',
  md: 'gap-4 sm:gap-6',
  lg: 'gap-6 sm:gap-8',
  xl: 'gap-8 sm:gap-12',
};

export function Grid<T extends GridElement = 'div'>({
  as,
  children,
  cols = 12,
  gap = 'md',
  className,
  ...rest
}: PolymorphicGridProps<T>) {
  const Component = (as || 'div') as ElementType;

  return (
    <Component
      className={cn('grid', colClasses[cols], gapClasses[gap], className)}
      {...rest}
    >
      {children}
    </Component>
  );
}

type GridItemElement = 'div' | 'li' | 'article' | 'section';

export interface GridItemProps<T extends GridItemElement = 'div'> {
  /** The HTML element to render as. Defaults to 'div'. Use 'li' when Grid is a list. */
  as?: T;
  children: ReactNode;
  colSpan?: 1 | 2 | 3 | 4 | 6 | 12;
  className?: string;
}

type PolymorphicGridItemProps<T extends GridItemElement = 'div'> =
  GridItemProps<T> & Omit<ComponentPropsWithoutRef<T>, keyof GridItemProps<T>>;

const spanClasses = {
  1: 'col-span-1',
  2: 'col-span-1 sm:col-span-2',
  3: 'col-span-1 sm:col-span-2 lg:col-span-3',
  4: 'col-span-1 sm:col-span-2 lg:col-span-4',
  6: 'col-span-2 sm:col-span-3 lg:col-span-6',
  12: 'col-span-full',
};

export function GridItem<T extends GridItemElement = 'div'>({
  as,
  children,
  colSpan = 1,
  className,
  ...rest
}: PolymorphicGridItemProps<T>) {
  const Component = (as || 'div') as ElementType;

  return (
    <Component
      className={cn('flex', spanClasses[colSpan], className)}
      {...rest}
    >
      {children}
    </Component>
  );
}
