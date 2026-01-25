import type { ReactNode } from 'react';

export interface AspectRatioProps {
  children: ReactNode;
  ratio?: '1/1' | '4/3' | '16/9' | '21/9' | '3/4' | '9/16';
  className?: string;
}

export function AspectRatio({
  children,
  ratio = '16/9',
  className = '',
}: AspectRatioProps) {
  return (
    <div
      className={`relative w-full ${className}`}
      style={{ aspectRatio: ratio }}
    >
      {children}
    </div>
  );
}
