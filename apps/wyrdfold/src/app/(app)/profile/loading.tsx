import { Card, CardContent, CardHeader } from '@danieljoffe/shared-ui/Card';
import { Heading } from '@danieljoffe/shared-ui/Heading';
import { Skeleton } from '@danieljoffe/shared-ui/Skeleton';
import { Text } from '@danieljoffe/shared-ui/Text';

export default function ProfileLoading() {
  return (
    <div className='flex flex-col gap-6' aria-label='Loading profile'>
      {/* Real heading + subtitle so size, line-height, and spacing match
          ProfilePage pixel-for-pixel. */}
      <div>
        <Heading variant='hero' as='h1'>
          Profile
        </Heading>
        <Text variant='body' className='mt-1 text-text-secondary'>
          Your master experience document and derived skills
        </Text>
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
