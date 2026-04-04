import { Heading } from './Heading';
import { Text } from './Text';

export function CTACard({
  heading,
  description,
  children,
}: {
  heading: string;
  description: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className='relative overflow-hidden rounded-2xl bg-surface-secondary border border-border p-8 sm:p-12'>
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
