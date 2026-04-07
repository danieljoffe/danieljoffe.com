import type { ReactNode, Ref } from 'react';
import { Heading } from './Heading';
import { Text } from './Text';
import { cn } from './utils';

export interface CTACardProps {
  heading: string;
  description: ReactNode;
  children: ReactNode;
  ref?: Ref<HTMLDivElement>;
  className?: string;
}

export function CTACard({
  heading,
  description,
  children,
  ref,
  className,
}: CTACardProps) {
  return (
    <div
      ref={ref}
      className={cn(
        'relative overflow-hidden rounded-xl bg-surface-secondary border border-border p-8 sm:p-12',
        className
      )}
    >
      <div className='space-y-4'>
        <Heading variant='section' className='text-center'>
          {heading}
        </Heading>
        <Text variant='body' className='max-w-md mx-auto text-center'>
          {description}
        </Text>
        <div className='pt-2'>{children}</div>
      </div>
    </div>
  );
}
