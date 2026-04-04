import { type HTMLAttributes, type ReactNode, type Ref } from 'react';
import { cn } from './utils';

export interface AspectRatioProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'children'
> {
  ref?: Ref<HTMLDivElement> | undefined;
  children: ReactNode;
  ratio?: '1/1' | '4/3' | '16/9' | '21/9' | '3/4' | '9/16';
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
  ref,
  ...props
}: AspectRatioProps) {
  return (
    <div
      ref={ref}
      className={cn('relative w-full', ratioClasses[ratio], className)}
      {...props}
    >
      {children}
    </div>
  );
}
