import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from './utils';

type DividerOrientation = 'horizontal' | 'vertical';

export interface DividerProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'className' | 'role'
> {
  orientation?: DividerOrientation;
  className?: string;
  label?: string | undefined;
}

export const Divider = forwardRef<HTMLDivElement, DividerProps>(
  ({ orientation = 'horizontal', className, label, ...props }, ref) => {
    if (orientation === 'vertical') {
      return (
        <div
          ref={ref}
          role='separator'
          aria-orientation='vertical'
          className={cn('w-px bg-border', className)}
          {...props}
        />
      );
    }

    if (label) {
      return (
        <div
          ref={ref}
          role='separator'
          aria-orientation='horizontal'
          className={cn('flex items-center gap-4', className)}
          {...props}
        >
          <div className='flex-1 h-px bg-border' aria-hidden='true' />
          <span className='text-sm text-text-secondary'>{label}</span>
          <div className='flex-1 h-px bg-border' aria-hidden='true' />
        </div>
      );
    }

    return (
      <div
        ref={ref}
        role='separator'
        aria-orientation='horizontal'
        className={cn('h-px bg-border', className)}
        {...props}
      />
    );
  }
);
Divider.displayName = 'Divider';
