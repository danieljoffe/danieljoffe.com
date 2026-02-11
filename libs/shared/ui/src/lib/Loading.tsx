import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from './utils';

export interface LoadingProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'className' | 'role'
> {
  /** Custom className for the container */
  className?: string;
}

/**
 * A fancy loading component with dual-ring spinner and bouncing dots animation.
 * Includes full ARIA support for accessibility.
 */
export const Loading = forwardRef<HTMLDivElement, LoadingProps>(
  (
    { 'aria-label': ariaLabel = 'Loading content', className, ...props },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          'flex items-center justify-center min-h-52 w-full',
          className
        )}
        role='status'
        aria-live='polite'
        aria-label={ariaLabel}
        {...props}
      >
        <div className='flex flex-col items-center gap-4'>
          {/* Bouncing dots */}
          <div className='flex gap-1'>
            <div className='size-2 bg-warning rounded-full animate-[bounceSubtle_0.6s_ease-in-out_infinite]' />
            <div className='size-2 bg-info rounded-full animate-[bounceSubtle_0.6s_ease-in-out_infinite_0.1s]' />
            <div className='size-2 bg-warning rounded-full animate-[bounceSubtle_0.6s_ease-in-out_infinite_0.2s]' />
            <div className='size-2 bg-error rounded-full animate-[bounceSubtle_0.6s_ease-in-out_infinite_0.3s]' />
          </div>

          {/* Loading text */}
          <p className='text-sm animate-[pulseSlow_2s_ease-in-out_infinite]'>
            Loading...
          </p>
        </div>
      </div>
    );
  }
);
Loading.displayName = 'Loading';
