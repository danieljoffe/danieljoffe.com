import { type ReactNode, type HTMLAttributes, type Ref } from 'react';
import { Container } from './Container';
import { cn } from './utils';

export interface PageContainerProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'className'
> {
  ref?: Ref<HTMLDivElement> | undefined;
  children: ReactNode;
  /** Container size - defaults to 'sm' for page content */
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
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
  size = 'sm',
  wrapperClassName,
  className,
  ref,
  ...rest
}: PageContainerProps) {
  return (
    <div
      ref={ref}
      className={cn('flex justify-center', wrapperClassName)}
      data-testid='page-container-outer'
    >
      <Container
        size={size}
        className={cn('flex flex-col py-8 md:py-14', className)}
        data-testid='page-container-inner'
        {...rest}
      >
        {children}
      </Container>
    </div>
  );
}
