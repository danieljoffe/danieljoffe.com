import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { cn } from './utils';

export interface AspectRatioProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'children'
> {
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

export const AspectRatio = forwardRef<HTMLDivElement, AspectRatioProps>(
  ({ children, ratio = '16/9', className, ...props }, ref) => {
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
);
AspectRatio.displayName = 'AspectRatio';
