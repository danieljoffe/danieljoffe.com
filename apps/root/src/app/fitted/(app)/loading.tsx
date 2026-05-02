import { Skeleton } from '@danieljoffe.com/shared-ui/Skeleton';

export default function DashboardLoading() {
  return (
    <div
      role='status'
      aria-label='Loading dashboard'
      className='flex flex-col gap-6'
    >
      {/* Heading + subtitle */}
      <div>
        <Skeleton variant='text' size='lg' className='w-32' />
        <Skeleton variant='text' className='mt-2 w-56' />
      </div>

      {/* Pipeline stat cards (4 cards) */}
      <div className='grid grid-cols-2 gap-3 sm:grid-cols-4'>
        {[0, 1, 2, 3].map(i => (
          <Skeleton key={i} variant='rectangular' height={88} />
        ))}
      </div>

      {/* Top matches section */}
      <div className='flex flex-col gap-3'>
        <Skeleton variant='text' size='lg' className='w-32' />
        <div className='flex flex-col gap-2'>
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className='flex items-start gap-3 rounded-xl border border-border bg-surface-elevated p-3'
            >
              <Skeleton variant='rectangular' width={40} height={24} />
              <div className='min-w-0 flex-1 flex flex-col gap-1'>
                <Skeleton width='60%' size='sm' />
                <Skeleton width='40%' size='sm' />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
