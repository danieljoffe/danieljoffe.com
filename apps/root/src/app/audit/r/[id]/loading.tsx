import ClientSkeleton from '@/components/ClientSkeleton';
import { PageLayout } from '@/components/kit';

export default function Loading() {
  return (
    <PageLayout>
      <div className='max-w-3xl mx-auto w-full px-4 sm:px-6 py-8 md:py-14'>
        <div className='flex flex-col gap-8'>
          {/* Report header */}
          <div className='flex flex-col gap-6'>
            {/* Action bar */}
            <div className='flex justify-between items-center'>
              <ClientSkeleton variant='text' width={100} height={16} />
              <ClientSkeleton variant='rectangular' width={80} height={36} />
            </div>
            {/* Header content */}
            <div className='flex flex-col md:flex-row gap-6'>
              <ClientSkeleton variant='rectangular' width={200} height={150} />
              <div className='flex flex-row gap-4 flex-1'>
                <div className='flex-1 min-w-0 space-y-3'>
                  <ClientSkeleton variant='text' height={28} width='80%' />
                  <ClientSkeleton variant='text' height={16} width='60%' />
                  <ClientSkeleton variant='text' height={14} width={120} />
                </div>
                <ClientSkeleton variant='rectangular' width={64} height={64} />
              </div>
            </div>
          </div>

          {/* Device tabs */}
          <div className='flex gap-4 border-b border-border pb-2'>
            <ClientSkeleton variant='text' width={70} height={20} />
            <ClientSkeleton variant='text' width={70} height={20} />
          </div>

          {/* Score cards */}
          <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
            {Array.from({ length: 4 }).map((_, i) => (
              <ClientSkeleton key={i} variant='rectangular' height={96} />
            ))}
          </div>

          {/* Core Web Vitals */}
          <div className='space-y-3'>
            <ClientSkeleton variant='text' width={160} height={22} />
            <div className='rounded-lg border border-border p-6 space-y-0'>
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className={[
                    'flex items-center justify-between py-3',
                    i < 4 ? 'border-b border-border' : '',
                  ].join(' ')}
                >
                  <ClientSkeleton variant='text' width={120} height={16} />
                  <ClientSkeleton variant='text' width={60} height={16} />
                </div>
              ))}
            </div>
          </div>

          {/* Issues list */}
          <div className='space-y-3'>
            <ClientSkeleton variant='text' width={120} height={22} />
            <ClientSkeleton variant='text' width='90%' height={14} />
            {Array.from({ length: 3 }).map((_, i) => (
              <ClientSkeleton key={i} variant='rectangular' height={80} />
            ))}
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
