import { Skeleton } from '@danieljoffe.com/shared-ui';
import { PageLayout } from '@/components/kit';

export default function Loading() {
  return (
    <PageLayout>
      <section className='w-full bg-surface-secondary overflow-hidden flex flex-col justify-center'>
        <div className='max-w-160 mx-auto w-full px-4 sm:px-6 text-center py-20 md:py-32'>
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
            <Skeleton
              variant='text'
              lines={2}
              width='80%'
              className='mx-auto'
            />
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
        </div>
      </section>
    </PageLayout>
  );
}
