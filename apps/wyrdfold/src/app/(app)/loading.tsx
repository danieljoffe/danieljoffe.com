import { Skeleton } from '@danieljoffe.com/shared-ui/Skeleton';

export default function AppLoading() {
  return (
    <div role='status' aria-label='Loading' className='flex flex-col gap-6'>
      <div>
        <Skeleton variant='text' size='lg' className='w-32' />
        <Skeleton variant='text' className='mt-2 w-56' />
      </div>
      <div className='grid grid-cols-2 gap-3 sm:grid-cols-4'>
        {[0, 1, 2, 3].map(i => (
          <Skeleton key={i} variant='rectangular' height={88} />
        ))}
      </div>
    </div>
  );
}
