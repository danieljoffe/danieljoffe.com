import { type HTMLAttributes, type Ref } from 'react';
import { Text } from './Text';
import { cn } from './utils';

type DividerOrientation = 'horizontal' | 'vertical';

export interface DividerProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'className' | 'role'
> {
  ref?: Ref<HTMLDivElement> | undefined;
  orientation?: DividerOrientation;
  className?: string;
  label?: string | undefined;
}

export function Divider({
  orientation = 'horizontal',
  className,
  label,
  ref,
  ...props
}: DividerProps) {
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
        <Text variant='caption' as='span'>
          {label}
        </Text>
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
