import { Heading } from '@danieljoffe.com/shared-ui/Heading';
import { Text } from '@danieljoffe.com/shared-ui/Text';
import { cn } from '@/lib/cn';

interface StepProps {
  number: number;
  title: string;
  description: string;
  className?: string;
}

export function Step({ number, title, description, className }: StepProps) {
  return (
    <div className={cn('flex gap-3', className)}>
      <span className='inline-flex items-center justify-center size-9 rounded-full bg-brand-500 text-text-inverse text-sm font-bold shrink-0'>
        {number}
      </span>
      <div>
        <Heading variant='cardTitle' as='p'>
          {title}
        </Heading>
        <Text variant='body' className='mt-1'>
          {description}
        </Text>
      </div>
    </div>
  );
}
