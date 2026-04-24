import { Skeleton } from '@danieljoffe.com/shared-ui/Skeleton';

export default function JobDetailLoading() {
  return (
    <div className='flex flex-col gap-6'>
      <div className='flex items-center gap-3'>
        <Skeleton variant='circular' size='sm' />
        <div>
          <Skeleton variant='text' size='lg' className='w-36' />
          <Skeleton variant='text' className='mt-1 w-24' />
        </div>
      </div>
      <div className='grid gap-4 md:grid-cols-2'>
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} variant='rectangular' height={160} />
        ))}
      </div>
    </div>
  );
}
