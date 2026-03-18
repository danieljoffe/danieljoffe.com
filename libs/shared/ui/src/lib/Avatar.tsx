'use client';

import { cn } from './utils/cn';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface AvatarProps {
  src?: string;
  alt?: string;
  initials?: string;
  size?: AvatarSize;
  status?: 'online' | 'offline' | 'away' | 'busy';
  className?: string;
}

const sizeStyles: Record<AvatarSize, string> = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-16 w-16 text-lg',
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
}: AvatarProps) {
  return (
    <div className={cn('relative inline-flex shrink-0', className)}>
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
            size === 'xs' || size === 'sm' ? 'h-2 w-2' : 'h-3 w-3'
          )}
        />
      )}
    </div>
  );
}
