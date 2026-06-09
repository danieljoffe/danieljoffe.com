import { Skeleton } from '@danieljoffe/shared-ui/Skeleton';
import { PageLayout } from '@danieljoffe/shared-ui/PageLayout';
import { Section } from '@danieljoffe/shared-ui/Section';

export default function Loading() {
  return (
    <PageLayout>
      <Section overflow='hidden' center padding='lg' className='text-center'>
        <div className='flex flex-col gap-6 items-center'>
          {/* Heading */}
          <div className='space-y-3 w-full'>
            <Skeleton
              variant='text'
              width='70%'
              height={36}
              className='mx-auto'
            />
            <Skeleton
              variant='text'
              width='50%'
              height={36}
              className='mx-auto'
            />
          </div>
          {/* Description */}
          <Skeleton variant='text' lines={2} width='80%' className='mx-auto' />
          {/* URL input form */}
          <Skeleton variant='rectangular' height={56} className='w-full' />
          {/* Scan count */}
          <Skeleton
            variant='text'
            width={180}
            height={14}
            className='mx-auto'
          />
        </div>
      </Section>
    </PageLayout>
  );
}
