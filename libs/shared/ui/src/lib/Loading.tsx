import { type HTMLAttributes, type Ref } from 'react';
import { Text } from './Text';
import { cn } from './utils';

export interface LoadingProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'className' | 'role'
> {
  ref?: Ref<HTMLDivElement> | undefined;
  /** Custom className for the container */
  className?: string;
}

/**
 * A fancy loading component with dual-ring spinner and bouncing dots animation.
 * Includes full ARIA support for accessibility.
 */
export function Loading({
  'aria-label': ariaLabel = 'Loading content',
  className,
  ref,
  ...props
}: LoadingProps) {
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
          <div className='size-2 bg-brand-500 rounded-full animate-[bounceSubtle_0.6s_ease-in-out_infinite] motion-reduce:animate-none' />
          <div className='size-2 bg-brand-500/60 rounded-full animate-[bounceSubtle_0.6s_ease-in-out_infinite_0.1s] motion-reduce:animate-none' />
          <div className='size-2 bg-brand-500 rounded-full animate-[bounceSubtle_0.6s_ease-in-out_infinite_0.2s] motion-reduce:animate-none' />
          <div className='size-2 bg-brand-500/60 rounded-full animate-[bounceSubtle_0.6s_ease-in-out_infinite_0.3s] motion-reduce:animate-none' />
        </div>

        {/* Loading text */}
        <Text
          variant='caption'
          className='animate-[pulseSlow_2s_ease-in-out_infinite] motion-reduce:animate-none'
        >
          Loading...
        </Text>
      </div>
    </div>
  );
}
