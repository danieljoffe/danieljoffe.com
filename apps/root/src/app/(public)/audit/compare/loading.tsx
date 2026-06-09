import { Skeleton } from '@danieljoffe/shared-ui/Skeleton';
import { PageLayout } from '@danieljoffe/shared-ui/PageLayout';

export default function Loading() {
  return (
    <PageLayout>
      <div
        role='status'
        aria-live='polite'
        aria-label='Loading comparison'
        className='max-w-3xl mx-auto w-full px-4 sm:px-6 py-8 md:py-14'
      >
        <div className='flex flex-col gap-8'>
          {/* Comparison header */}
          <div className='flex flex-col gap-6'>
            <Skeleton variant='text' width={120} height={16} />
            <Skeleton variant='text' width={180} height={28} />
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className='flex items-start gap-3'>
                  <Skeleton variant='rectangular' width={48} height={48} />
                  <div className='flex-1 space-y-2'>
                    <Skeleton variant='text' width={80} height={12} />
                    <Skeleton variant='text' height={18} width='80%' />
                    <Skeleton variant='text' width={120} height={12} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Score delta cards */}
          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'>
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} variant='rectangular' height={140} />
            ))}
          </div>

          {/* Core Web Vitals delta */}
          <div className='space-y-3'>
            <Skeleton variant='text' width={160} height={22} />
            <div className='rounded-lg border border-border p-6 space-y-0'>
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className={[
                    'flex items-center justify-between py-3',
                    i < 4 ? 'border-b border-border' : '',
                  ].join(' ')}
                >
                  <Skeleton variant='text' width={140} height={16} />
                  <Skeleton variant='text' width={140} height={16} />
                </div>
              ))}
            </div>
          </div>

          {/* Issue diff */}
          <div className='space-y-6'>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className='space-y-3'>
                <Skeleton variant='text' width={120} height={22} />
                <Skeleton variant='rectangular' height={80} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
