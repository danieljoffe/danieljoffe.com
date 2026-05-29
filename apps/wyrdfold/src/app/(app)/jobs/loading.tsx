import { Skeleton } from '@danieljoffe.com/shared-ui/Skeleton';
import JobsTableSkeleton from './JobsTableSkeleton';

export default function FittedJobsLoading() {
  return (
    <div className='flex flex-col gap-6' aria-label='Loading jobs'>
      {/* Heading "Jobs" (hero h1 ~ text-4xl sm:text-5xl) + subtitle */}
      <div>
        <Skeleton variant='rectangular' width={140} height={40} />
        <div className='mt-2'>
          <Skeleton width={280} size='md' />
        </div>
      </div>

      {/* Target tab strip (border-b, gap-1) — first tab "All Jobs" is shorter
          than the target labels, so vary the widths. */}
      <div className='border-b border-border'>
        <div className='flex gap-1 pb-px'>
          <Skeleton variant='rectangular' width={80} height={36} />
          <Skeleton variant='rectangular' width={210} height={36} />
          <Skeleton variant='rectangular' width={190} height={36} />
        </div>
      </div>

      {/* JobsFilter: search input (full-width row) + filter pills */}
      <div className='flex flex-col gap-2.5'>
        <Skeleton variant='rectangular' className='h-9 w-full' />
        <div className='flex flex-wrap items-center gap-2'>
          <Skeleton
            variant='rectangular'
            width={110}
            height={32}
            className='rounded-full'
          />
          <Skeleton
            variant='rectangular'
            width={130}
            height={32}
            className='rounded-full'
          />
        </div>
      </div>

      <JobsTableSkeleton />
    </div>
  );
}
