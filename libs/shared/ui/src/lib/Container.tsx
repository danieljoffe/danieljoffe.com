import { type ReactNode, type HTMLAttributes, type Ref } from 'react';
import { cn } from './utils';

export type ContainerSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';

export interface ContainerProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'className'
> {
  ref?: Ref<HTMLDivElement> | undefined;
  children: ReactNode;
  size?: ContainerSize;
  className?: string;
}

const sizeClasses: Record<ContainerSize, string> = {
  sm: 'max-w-3xl',
  md: 'max-w-4xl',
  lg: 'max-w-5xl',
  xl: 'max-w-6xl',
  '2xl': 'max-w-7xl',
  full: 'max-w-full',
};

export function Container({
  children,
  size = 'full',
  className,
  ref,
  ...rest
}: ContainerProps) {
  return (
    <div
      ref={ref}
      className={cn(
        'mx-auto w-full px-4 sm:px-6 lg:px-8',
        sizeClasses[size],
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
