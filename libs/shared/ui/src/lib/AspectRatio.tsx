import type { ReactNode } from 'react';
import { cn } from './utils';

export interface AspectRatioProps {
  children: ReactNode;
  ratio?: '1/1' | '4/3' | '16/9' | '21/9' | '3/4' | '9/16';
  className?: string;
}

const ratioClasses: Record<NonNullable<AspectRatioProps['ratio']>, string> = {
  '1/1': 'aspect-square',
  '4/3': 'aspect-[4/3]',
  '16/9': 'aspect-video',
  '21/9': 'aspect-[21/9]',
  '3/4': 'aspect-[3/4]',
  '9/16': 'aspect-[9/16]',
};

export function AspectRatio({
  children,
  ratio = '16/9',
  className,
}: AspectRatioProps) {
  return (
    <div className={cn('relative w-full', ratioClasses[ratio], className)}>
      {children}
    </div>
  );
}
