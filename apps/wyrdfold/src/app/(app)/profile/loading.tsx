import { Card, CardContent, CardHeader } from '@danieljoffe.com/shared-ui/Card';
import { Skeleton } from '@danieljoffe.com/shared-ui/Skeleton';

export default function ProfileLoading() {
  return (
    <div className='flex flex-col gap-6' aria-label='Loading profile'>
      {/* Hero h1 "Profile" + body subtitle. */}
      <div>
        <Skeleton variant='rectangular' width={140} height={40} />
        <Skeleton className='mt-2 w-72' size='md' />
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
          {/* Master Document body — rendered markdown can be 400-800px tall;
              200 caused the page to grow significantly on swap. */}
          <Skeleton variant='rectangular' height={400} />
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
