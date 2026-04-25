import { Skeleton } from '@danieljoffe.com/shared-ui/Skeleton';

export default function FittedTargetDetailLoading() {
  return (
    <div className='flex flex-col gap-6'>
      <Skeleton variant='text' className='h-6 w-24' />
      <Skeleton variant='text' className='h-8 w-64' />
      <Skeleton variant='rectangular' className='h-96 w-full rounded-lg' />
      <Skeleton variant='rectangular' className='h-48 w-full rounded-lg' />
      <Skeleton variant='rectangular' className='h-32 w-full rounded-lg' />
    </div>
  );
}
