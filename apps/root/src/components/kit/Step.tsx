import { Heading } from '@danieljoffe/shared-ui/Heading';
import { Text } from '@danieljoffe/shared-ui/Text';
import { cn } from '@/lib/cn';

interface StepProps {
  number: number | string;
  title: string;
  description: string;
  /** HTML element for the title. Defaults to 'p'. Use 'h3' etc. when steps live inside a sectioning element. */
  titleAs?: 'p' | 'h2' | 'h3' | 'h4';
  className?: string;
}

export function Step({
  number,
  title,
  description,
  titleAs = 'p',
  className,
}: StepProps) {
  return (
    <div className={cn('flex gap-3', className)}>
      <span className='inline-flex items-center justify-center size-9 rounded-full bg-brand-500 text-text-inverse text-sm font-bold shrink-0'>
        {number}
      </span>
      <div>
        <Heading variant='cardTitle' as={titleAs}>
          {title}
        </Heading>
        <Text variant='body' className='mt-1'>
          {description}
        </Text>
      </div>
    </div>
  );
}
