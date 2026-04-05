import type { Ref } from 'react';
import { cn } from './utils';

export interface GridBgProps {
  ref?: Ref<HTMLDivElement>;
  className?: string;
}

export function GridBg({ ref, className }: GridBgProps) {
  return (
    <div
      ref={ref}
      className={cn(
        'absolute inset-0 overflow-hidden pointer-events-none',
        className
      )}
    >
      <div
        className='absolute inset-0 opacity-[0.03]'
        style={{
          backgroundImage: `linear-gradient(var(--color-border) 1px, transparent 1px), linear-gradient(90deg, var(--color-border) 1px, transparent 1px)`,
          backgroundSize: '64px 64px',
        }}
      />
      <div className='absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-brand-500/5 rounded-full blur-3xl' />
    </div>
  );
}
