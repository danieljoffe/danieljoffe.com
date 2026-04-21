import { type ReactNode, type HTMLAttributes, type Ref } from 'react';
import { Container, type ContainerSize } from './Container';
import { cn } from './utils';

export interface PageContainerProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'className'
> {
  ref?: Ref<HTMLDivElement> | undefined;
  children: ReactNode;
  /** HTML element for the outer wrapper - defaults to 'div' */
  as?: 'div' | 'main' | 'section';
  /** Container size - defaults to 'sm' for page content */
  size?: ContainerSize;
  /** Additional classes for the outer wrapper */
  wrapperClassName?: string;
  /** Additional classes for the inner container */
  className?: string;
}

/**
 * PageContainer provides a standard page layout pattern with:
 * - Outer flex centering wrapper
 * - Inner Container with vertical padding
 * - Consistent page content width
 */
export function PageContainer({
  children,
  as: Tag = 'div',
  size = 'sm',
  wrapperClassName,
  className,
  ref,
  ...rest
}: PageContainerProps) {
  return (
    <Tag
      ref={ref}
      className={cn('flex justify-center', wrapperClassName)}
      data-testid='page-container-outer'
      {...rest}
    >
      <Container
        size={size}
        className={cn('flex flex-col py-8 md:py-14', className)}
        data-testid='page-container-inner'
      >
        {children}
      </Container>
    </Tag>
  );
}
