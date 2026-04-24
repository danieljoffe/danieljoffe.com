import { Skeleton } from '@danieljoffe.com/shared-ui/Skeleton';

export default function InsightsLoading() {
  return (
    <div className='flex flex-col gap-6'>
      <div>
        <Skeleton variant='text' size='lg' className='w-32' />
        <Skeleton variant='text' className='mt-2 w-56' />
      </div>
      <div className='grid gap-4 grid-cols-2 lg:grid-cols-4'>
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} variant='rectangular' height={100} />
        ))}
      </div>
      <Skeleton variant='rectangular' height={200} />
    </div>
  );
}
