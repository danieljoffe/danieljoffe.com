import { Card, CardContent } from '@danieljoffe/shared-ui/Card';
import { Skeleton } from '@danieljoffe/shared-ui/Skeleton';

export default function JobDetailLoading() {
  return (
    <div className='flex flex-col gap-6' aria-label='Loading job'>
      {/* Back arrow + title + metadata column */}
      <div className='flex items-start gap-3'>
        <Skeleton variant='rectangular' width={32} height={32} />
        <div className='flex-1 min-w-0 flex flex-col gap-2'>
          <div className='flex items-center gap-2'>
            <Skeleton width='60%' size='lg' />
            <Skeleton variant='rectangular' width={32} height={32} />
          </div>
          <Skeleton width='30%' size='sm' />
          <Skeleton width='25%' size='sm' />
          <Skeleton width='20%' size='sm' />
        </div>
      </div>

      {/* Detail panel card — mirrors JobDetailPanel sections */}
      <Card padding='none'>
        <CardContent className='flex flex-col gap-4 p-4'>
          {/* Status + Score row */}
          <div>
            <Skeleton width={60} size='sm' className='mb-1' />
            <div className='flex items-center justify-between gap-3'>
              <Skeleton variant='rectangular' width={140} height={32} />
              <Skeleton variant='rectangular' width={80} height={24} />
            </div>
          </div>

          {/* Score breakdown */}
          <div>
            <Skeleton width={120} size='sm' className='mb-2' />
            <Skeleton variant='text' lines={3} />
          </div>

          {/* History */}
          <div>
            <Skeleton width={80} size='sm' className='mb-1' />
            <Skeleton variant='text' lines={2} />
          </div>

          {/* Resume + Cover letter blocks */}
          <div className='flex flex-col gap-2'>
            <Skeleton width={140} size='sm' />
            <Skeleton variant='rectangular' width={160} height={32} />
          </div>
          <div className='flex flex-col gap-2'>
            <Skeleton width={140} size='sm' />
            <Skeleton variant='rectangular' width={180} height={32} />
          </div>
        </CardContent>
      </Card>

      {/* Centered delete button */}
      <div className='flex justify-center pt-2'>
        <Skeleton variant='rectangular' width={120} height={32} />
      </div>
    </div>
  );
}
