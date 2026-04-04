import ClientSkeleton from '@/components/ClientSkeleton';
import { PageLayout } from '@/components/kit';

export default function Loading() {
  return (
    <PageLayout>
      <div className='max-w-3xl mx-auto w-full px-4 sm:px-6'>
        <div className='flex flex-col gap-6 py-8'>
          {/* Title bar */}
          <div className='flex flex-row justify-between items-start'>
            <ClientSkeleton variant='text' width={200} height={28} />
            <ClientSkeleton variant='rectangular' width={100} height={36} />
          </div>

          {/* Stats row */}
          <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
            {Array.from({ length: 4 }).map((_, i) => (
              <ClientSkeleton key={i} variant='rectangular' height={96} />
            ))}
          </div>

          {/* Tab navigation */}
          <div className='flex gap-4 border-b border-border pb-2'>
            <ClientSkeleton variant='text' width={60} height={20} />
            <ClientSkeleton variant='text' width={50} height={20} />
          </div>

          {/* Table */}
          <div className='space-y-3'>
            <ClientSkeleton variant='text' height={16} />
            {Array.from({ length: 10 }).map((_, i) => (
              <ClientSkeleton key={i} variant='text' height={40} />
            ))}
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
