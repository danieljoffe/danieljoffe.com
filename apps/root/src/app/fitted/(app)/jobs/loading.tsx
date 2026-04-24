import { Skeleton } from '@danieljoffe.com/shared-ui/Skeleton';

export default function FittedJobsLoading() {
  return (
    <div className='flex flex-col gap-6'>
      <Skeleton variant='text' className='h-8 w-32' />
      <div className='flex gap-3'>
        <Skeleton variant='rectangular' className='h-10 w-28' />
        <Skeleton variant='rectangular' className='h-10 w-40' />
        <Skeleton variant='rectangular' className='h-10 flex-1' />
      </div>
      <div className='space-y-2'>
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} variant='rectangular' className='h-12 w-full' />
        ))}
      </div>
    </div>
  );
}
