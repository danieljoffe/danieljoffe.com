import ClientSkeleton from '@/components/ClientSkeleton';
import { PageLayout } from '@danieljoffe.com/shared-ui/PageLayout';

export default function Loading() {
  return (
    <PageLayout className='py-16 lg:py-24 space-y-24'>
      <section className='w-full bg-surface-secondary overflow-hidden flex flex-col justify-center'>
        <div className='max-w-[40rem] mx-auto w-full px-4 sm:px-6 text-center py-20 md:py-32'>
          <div className='flex flex-col gap-6 items-center'>
            {/* Heading */}
            <div className='space-y-3 w-full'>
              <ClientSkeleton
                variant='text'
                width='70%'
                height={36}
                className='mx-auto'
              />
              <ClientSkeleton
                variant='text'
                width='50%'
                height={36}
                className='mx-auto'
              />
            </div>
            {/* Description */}
            <ClientSkeleton
              variant='text'
              lines={2}
              width='80%'
              className='mx-auto'
            />
            {/* URL input form */}
            <ClientSkeleton
              variant='rectangular'
              height={56}
              className='w-full'
            />
            {/* Scan count */}
            <ClientSkeleton
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
