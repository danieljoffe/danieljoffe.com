import { Skeleton } from '@danieljoffe.com/shared-ui/Skeleton';

export default function FittedTargetsLoading() {
  return (
    <div className='flex flex-col gap-6'>
      <div className='flex items-center justify-between'>
        <Skeleton variant='text' className='h-8 w-32' />
        <Skeleton variant='rectangular' className='h-10 w-36' />
      </div>
      <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton
            key={i}
            variant='rectangular'
            className='h-48 w-full rounded-lg'
          />
        ))}
      </div>
    </div>
  );
}
