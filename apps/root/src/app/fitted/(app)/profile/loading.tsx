import { Card, CardContent, CardHeader } from '@danieljoffe.com/shared-ui/Card';
import { Skeleton } from '@danieljoffe.com/shared-ui/Skeleton';

export default function ProfileLoading() {
  return (
    <div className='flex flex-col gap-6' aria-label='Loading profile'>
      {/* Heading + subtitle */}
      <div>
        <Skeleton variant='text' size='lg' className='w-32' />
        <Skeleton variant='text' className='mt-2 w-56' />
      </div>

      {/* Document Health card */}
      <Card>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <Skeleton width={140} height={20} />
            <Skeleton variant='rectangular' width={56} height={20} />
          </div>
        </CardHeader>
        <CardContent>
          <Skeleton variant='rectangular' height={8} />
        </CardContent>
      </Card>

      {/* Master Document card */}
      <Card>
        <CardHeader>
          <div className='flex items-center justify-between gap-3'>
            <Skeleton width={180} height={20} />
            <Skeleton width={90} height={14} />
          </div>
        </CardHeader>
        <CardContent className='flex flex-col gap-3'>
          <div className='flex flex-wrap gap-2'>
            <Skeleton variant='rectangular' width={140} height={32} />
            <Skeleton variant='rectangular' width={160} height={32} />
          </div>
          <Skeleton variant='rectangular' height={200} />
        </CardContent>
      </Card>

      {/* Optimized profile card */}
      <Card>
        <CardHeader>
          <Skeleton width={160} height={20} />
        </CardHeader>
        <CardContent className='flex flex-col gap-3'>
          <Skeleton variant='text' lines={2} />
          <Skeleton variant='rectangular' height={120} />
        </CardContent>
      </Card>
    </div>
  );
}
