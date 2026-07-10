import { type HTMLAttributes, type Ref } from 'react';
import type { ComponentSize } from './types';
import { cn } from './utils/cn';

export interface AvatarProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'className'
> {
  ref?: Ref<HTMLDivElement> | undefined;
  src?: string;
  alt?: string;
  initials?: string;
  size?: ComponentSize;
  status?: 'online' | 'offline' | 'away' | 'busy';
  className?: string;
}

const sizeStyles: Record<ComponentSize, string> = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
};

const statusColors: Record<string, string> = {
  online: 'bg-success',
  offline: 'bg-text-tertiary',
  away: 'bg-warning',
  busy: 'bg-error',
};

export function Avatar({
  src,
  alt = '',
  initials,
  size = 'md',
  status,
  className,
  ref,
  ...rest
}: AvatarProps) {
  return (
    <div
      ref={ref}
      className={cn('relative inline-flex shrink-0', className)}
      {...rest}
    >
      <div
        className={cn(
          'rounded-full flex items-center justify-center font-medium overflow-hidden',
          'bg-brand-100 text-brand-700',
          sizeStyles[size]
        )}
      >
        {src ? (
          <img src={src} alt={alt} className='h-full w-full object-cover' />
        ) : (
          <span>{initials || alt?.charAt(0)?.toUpperCase() || '?'}</span>
        )}
      </div>
      {status && (
        <span
          className={cn(
            'absolute bottom-0 right-0 rounded-full border-2 border-surface',
            statusColors[status],
            size === 'sm' ? 'h-2 w-2' : 'h-3 w-3'
          )}
        />
      )}
    </div>
  );
}
