import { Skeleton } from '@danieljoffe.com/shared-ui/Skeleton';

export default function SettingsLoading() {
  return (
    <div className='flex flex-col gap-6'>
      <div>
        <Skeleton variant='text' size='lg' className='w-32' />
        <Skeleton variant='text' className='mt-2 w-56' />
      </div>
      <Skeleton variant='rectangular' height={300} />
      <Skeleton variant='rectangular' height={250} />
    </div>
  );
}
