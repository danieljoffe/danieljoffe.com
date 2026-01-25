import type { ReactNode, HTMLAttributes } from 'react';

export interface ContainerProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'className'> {
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  className?: string;
}

const sizeClasses = {
  sm: 'max-w-3xl',
  md: 'max-w-5xl',
  lg: 'max-w-7xl',
  xl: 'max-w-[1400px]',
  full: 'max-w-full',
};

export function Container({
  children,
  size = 'full',
  className = '',
  ...rest
}: ContainerProps) {
  return (
    <div
      className={`mx-auto w-full px-4 sm:px-6 ${sizeClasses[size]} ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}
