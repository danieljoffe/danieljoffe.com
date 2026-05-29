import { Heading } from '@danieljoffe.com/shared-ui/Heading';
import { Skeleton } from '@danieljoffe.com/shared-ui/Skeleton';
import { Text } from '@danieljoffe.com/shared-ui/Text';

export default function InsightsLoading() {
  return (
    <div className='flex flex-col gap-6'>
      {/* Real heading + subtitle so size and spacing match the post-load
          InsightsDashboard pixel-for-pixel. */}
      <div>
        <Heading variant='hero' as='h1'>
          Insights
        </Heading>
        <Text variant='body' className='mt-1 text-text-secondary'>
          Track your job search progress
        </Text>
      </div>

      {/* Period segmented control. */}
      <Skeleton variant='rectangular' height={36} className='w-56' />

      {/* KPI cards. */}
      <div className='grid gap-4 grid-cols-2 lg:grid-cols-4'>
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} variant='rectangular' height={100} />
        ))}
      </div>

      {/* Velocity chart. ChartSkeleton in-component renders h=250, so we match
          it here — using 300 caused every chart to jump 50px on swap. */}
      <Skeleton variant='rectangular' height={250} />

      {/* Two-column charts. */}
      <div className='grid gap-6 grid-cols-1 lg:grid-cols-2'>
        <Skeleton variant='rectangular' height={250} />
        <Skeleton variant='rectangular' height={250} />
      </div>
      <div className='grid gap-6 grid-cols-1 lg:grid-cols-2'>
        <Skeleton variant='rectangular' height={250} />
        <Skeleton variant='rectangular' height={250} />
      </div>

      {/* Cost chart. */}
      <Skeleton variant='rectangular' height={250} />
    </div>
  );
}
