import { Skeleton } from '@danieljoffe.com/shared-ui/Skeleton';

export default function FittedJobsLoading() {
  return (
    <div className='flex flex-col gap-6' aria-label='Loading jobs'>
      {/* Heading + subtitle */}
      <div className='flex flex-col gap-2'>
        <Skeleton width={120} size='lg' />
        <Skeleton width={280} size='sm' />
      </div>

      {/* Tab bar */}
      <div className='flex gap-1 border-b border-border pb-px'>
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} variant='rectangular' width={90} height={36} />
        ))}
      </div>

      {/* Filter row */}
      <div className='flex flex-wrap gap-3'>
        <Skeleton variant='rectangular' width={120} height={36} />
        <Skeleton variant='rectangular' width={140} height={36} />
        <Skeleton variant='rectangular' className='h-9 flex-1 min-w-[200px]' />
      </div>

      {/* List rows — match JobsListTable density */}
      <div className='space-y-3'>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className='flex items-center gap-3 px-3 py-2'>
            <Skeleton variant='rectangular' width={40} height={24} />
            <Skeleton width='40%' size='sm' />
            <Skeleton width='20%' size='sm' />
            <Skeleton width='10%' size='sm' />
          </div>
        ))}
      </div>
    </div>
  );
}
