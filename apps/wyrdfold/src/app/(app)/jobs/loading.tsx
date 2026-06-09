import { Heading } from '@danieljoffe/shared-ui/Heading';
import { Skeleton } from '@danieljoffe/shared-ui/Skeleton';
import { Text } from '@danieljoffe/shared-ui/Text';
import JobsTableSkeleton from './JobsTableSkeleton';

export default function FittedJobsLoading() {
  return (
    <div className='flex flex-col gap-6' aria-label='Loading jobs'>
      {/* Render the real heading + subtitle so size, line-height, and spacing
          match the post-load page pixel-for-pixel — no skeleton bar can mimic
          text-5xl leading-[1.1] perfectly across breakpoints. */}
      <div>
        <Heading variant='hero' as='h1'>
          Jobs
        </Heading>
        <Text variant='body' className='mt-1 text-text-secondary'>
          Postings matched to your active targets
        </Text>
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
