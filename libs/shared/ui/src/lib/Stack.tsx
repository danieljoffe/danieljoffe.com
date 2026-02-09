import type { ReactNode, ElementType, ComponentPropsWithoutRef } from 'react';
import { cn } from './utils';

type StackElement =
  | 'div'
  | 'ul'
  | 'ol'
  | 'nav'
  | 'section'
  | 'article'
  | 'aside'
  | 'main'
  | 'header'
  | 'footer';

export interface StackProps<T extends StackElement = 'div'> {
  /** The HTML element to render as. Defaults to 'div'. Use 'ul' or 'ol' for semantic lists. */
  as?: T;
  children: ReactNode;
  direction?: 'vertical' | 'horizontal';
  gap?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  align?: 'start' | 'center' | 'end' | 'stretch';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
  wrap?: boolean;
  className?: string;
}

type PolymorphicStackProps<T extends StackElement = 'div'> = StackProps<T> &
  Omit<ComponentPropsWithoutRef<T>, keyof StackProps<T>>;

const directionClasses = {
  vertical: 'flex-col',
  horizontal: 'flex-row',
};

const gapClasses = {
  none: 'gap-0',
  xs: 'gap-1',
  sm: 'gap-2',
  md: 'gap-4',
  lg: 'gap-6',
  xl: 'gap-8',
};

const alignClasses = {
  start: 'items-start',
  center: 'items-center',
  end: 'items-end',
  stretch: 'items-stretch',
};

const justifyClasses = {
  start: 'justify-start',
  center: 'justify-center',
  end: 'justify-end',
  between: 'justify-between',
  around: 'justify-around',
  evenly: 'justify-evenly',
};

export function Stack<T extends StackElement = 'div'>({
  as,
  children,
  direction = 'vertical',
  gap = 'md',
  align = 'stretch',
  justify = 'start',
  wrap = false,
  className,
  ...rest
}: PolymorphicStackProps<T>) {
  const Component = (as || 'div') as ElementType;

  return (
    <Component
      className={cn(
        'flex',
        directionClasses[direction],
        gapClasses[gap],
        alignClasses[align],
        justifyClasses[justify],
        wrap && 'flex-wrap',
        className
      )}
      {...rest}
    >
      {children}
    </Component>
  );
}
