import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from './utils';

export interface SpacerProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'className'
> {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
}

const sizeClasses = {
  xs: 'h-2',
  sm: 'h-4',
  md: 'h-8',
  lg: 'h-12',
  xl: 'h-16',
  '2xl': 'h-24',
};

export const Spacer = forwardRef<HTMLDivElement, SpacerProps>(
  ({ size = 'md', className, ...props }, ref) => {
    return (
      <div ref={ref} className={cn(sizeClasses[size], className)} {...props} />
    );
  }
);
Spacer.displayName = 'Spacer';
