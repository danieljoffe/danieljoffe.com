import type { ReactNode, HTMLAttributes } from 'react';
import { Container } from './Container';

export interface PageContainerProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'className'> {
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
  wrapperClassName = '',
  className = '',
  ...rest
}: PageContainerProps) {
  return (
    <div
      className={`flex justify-center ${wrapperClassName}`}
      data-testid='page-container-outer'
    >
      <Container
        size={size}
        className={`flex flex-col py-8 md:py-14 ${className}`}
        data-testid='page-container-inner'
        {...rest}
      >
        {children}
      </Container>
    </div>
  );
}
