import { cn } from './utils';

type DividerOrientation = 'horizontal' | 'vertical';

export interface DividerProps {
  orientation?: DividerOrientation;
  className?: string;
  label?: string;
}

export function Divider({
  orientation = 'horizontal',
  className,
  label,
}: DividerProps) {
  if (orientation === 'vertical') {
    return (
      <div
        role='separator'
        aria-orientation='vertical'
        className={cn('w-px bg-border', className)}
      />
    );
  }

  if (label) {
    return (
      <div
        role='separator'
        aria-orientation='horizontal'
        className={cn('flex items-center gap-4', className)}
      >
        <div className='flex-1 h-px bg-border' aria-hidden='true' />
        <span className='text-sm text-foreground-muted'>{label}</span>
        <div className='flex-1 h-px bg-border' aria-hidden='true' />
      </div>
    );
  }

  return (
    <div
      role='separator'
      aria-orientation='horizontal'
      className={cn('h-px bg-border', className)}
    />
  );
}
