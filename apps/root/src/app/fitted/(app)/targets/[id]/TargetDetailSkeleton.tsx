import { Card, CardContent } from '@danieljoffe.com/shared-ui/Card';
import { Skeleton } from '@danieljoffe.com/shared-ui/Skeleton';

export default function TargetDetailSkeleton() {
  return (
    <div className='flex flex-col gap-6' aria-label='Loading target'>
      <Skeleton width={120} size='sm' />

      <div className='flex items-center gap-3'>
        <Skeleton width={280} height={32} />
        <Skeleton variant='rectangular' width={56} height={20} />
      </div>

      <Card padding='none'>
        <CardContent className='p-4 flex flex-col gap-4'>
          <Skeleton width='40%' size='lg' />
          <Skeleton lines={2} size='sm' />
          <div className='grid gap-3 sm:grid-cols-2'>
            <Skeleton variant='rectangular' height={72} />
            <Skeleton variant='rectangular' height={72} />
            <Skeleton variant='rectangular' height={72} />
            <Skeleton variant='rectangular' height={72} />
          </div>
        </CardContent>
      </Card>

      <Card padding='none'>
        <CardContent className='p-4 flex flex-col gap-3'>
          <div className='flex items-center justify-between'>
            <Skeleton width={160} size='lg' />
            <Skeleton variant='rectangular' width={120} height={32} />
          </div>
          <Skeleton variant='rectangular' height={56} />
          <Skeleton variant='rectangular' height={56} />
        </CardContent>
      </Card>
    </div>
  );
}
