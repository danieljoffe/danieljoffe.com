import type { Ref } from 'react';
import { cn } from './utils';

export interface KbdProps {
  children: string;
  ref?: Ref<HTMLElement>;
  className?: string;
}

export function Kbd({ children, ref, className }: KbdProps) {
  return (
    <kbd
      ref={ref}
      className={cn(
        'hidden sm:inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 text-[10px] font-mono font-medium text-text-tertiary bg-surface-tertiary border border-border rounded',
        className
      )}
    >
      {children}
    </kbd>
  );
}
