import type { ReactNode, Ref } from 'react';
import { Text } from './Text';
import { cn } from './utils';

export interface SectionLabelProps {
  icon: ReactNode;
  label: string;
  ref?: Ref<HTMLDivElement>;
  className?: string;
}

export function SectionLabel({
  icon,
  label,
  ref,
  className,
}: SectionLabelProps) {
  return (
    <div ref={ref} className={cn('flex items-center gap-2 mb-8', className)}>
      <div className='p-1.5 rounded-md bg-surface-tertiary text-text-secondary'>
        {icon}
      </div>
      <Text variant='label'>{label}</Text>
      <div className='flex-1 h-px bg-border ml-2' />
    </div>
  );
}
