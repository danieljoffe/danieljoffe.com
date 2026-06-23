import type { ReactNode, Ref } from 'react';
import { Heading } from './Heading';
import { cn } from './utils';

export interface SectionLabelProps {
  icon: ReactNode;
  label: string;
  /** Heading level for the label (default h2). Use h3 for a nested section. */
  as?: 'h2' | 'h3';
  ref?: Ref<HTMLDivElement>;
  className?: string;
}

export function SectionLabel({
  icon,
  label,
  as,
  ref,
  className,
}: SectionLabelProps) {
  return (
    <div ref={ref} className={cn('flex items-center gap-2 mb-8', className)}>
      <div className='p-1.5 rounded-md bg-surface-tertiary text-text-secondary'>
        {icon}
      </div>
      <Heading variant='sectionLabel' as={as}>
        {label}
      </Heading>
      <div className='flex-1 h-px bg-border ml-2' />
    </div>
  );
}
