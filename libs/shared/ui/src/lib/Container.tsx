import { type ReactNode, type HTMLAttributes, type Ref } from 'react';
import { cn } from './utils';

export interface ContainerProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'className'
> {
  ref?: Ref<HTMLDivElement> | undefined;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  className?: string;
}

const sizeClasses = {
  sm: 'max-w-3xl',
  md: 'max-w-5xl',
  lg: 'max-w-7xl',
  xl: 'max-w-8xl',
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
        'mx-auto w-full px-4 sm:px-6',
        sizeClasses[size],
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
