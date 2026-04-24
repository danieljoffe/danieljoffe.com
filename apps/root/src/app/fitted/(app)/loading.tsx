import { Skeleton } from '@danieljoffe.com/shared-ui/Skeleton';

export default function DashboardLoading() {
  return (
    <div className='flex flex-col gap-6'>
      <div>
        <Skeleton variant='text' size='lg' className='w-40' />
        <Skeleton variant='text' className='mt-2 w-64' />
      </div>
      <Skeleton variant='rectangular' height={120} />
    </div>
  );
}
