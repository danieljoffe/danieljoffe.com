import { Skeleton } from '@danieljoffe.com/shared-ui/Skeleton';

export default function InsightsLoading() {
  return (
    <div className='flex flex-col gap-6'>
      {/* Header */}
      <div>
        <Skeleton variant='text' size='lg' className='w-32' />
        <Skeleton variant='text' className='mt-2 w-56' />
      </div>

      {/* Period filter */}
      <Skeleton variant='rectangular' height={44} className='w-56' />

      {/* KPI cards */}
      <div className='grid gap-4 grid-cols-2 lg:grid-cols-4'>
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} variant='rectangular' height={100} />
        ))}
      </div>

      {/* Velocity chart */}
      <Skeleton variant='rectangular' height={300} />

      {/* Two-column charts */}
      <div className='grid gap-6 grid-cols-1 lg:grid-cols-2'>
        <Skeleton variant='rectangular' height={300} />
        <Skeleton variant='rectangular' height={300} />
      </div>
      <div className='grid gap-6 grid-cols-1 lg:grid-cols-2'>
        <Skeleton variant='rectangular' height={300} />
        <Skeleton variant='rectangular' height={300} />
      </div>

      {/* Cost chart */}
      <Skeleton variant='rectangular' height={300} />
    </div>
  );
}
