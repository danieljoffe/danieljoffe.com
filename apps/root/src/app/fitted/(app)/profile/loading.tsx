import { Skeleton } from '@danieljoffe.com/shared-ui/Skeleton';

export default function ProfileLoading() {
  return (
    <div className='flex flex-col gap-6'>
      <div>
        <Skeleton variant='text' size='lg' className='w-32' />
        <Skeleton variant='text' className='mt-2 w-56' />
      </div>
      <Skeleton variant='rectangular' height={120} />
      <div className='grid gap-4 md:grid-cols-2'>
        <Skeleton variant='rectangular' height={200} />
        <Skeleton variant='rectangular' height={200} />
      </div>
      <Skeleton variant='rectangular' height={140} />
    </div>
  );
}
