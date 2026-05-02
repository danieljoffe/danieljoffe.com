import { Card, CardContent, CardHeader } from '@danieljoffe.com/shared-ui/Card';
import { Skeleton } from '@danieljoffe.com/shared-ui/Skeleton';

export default function SettingsLoading() {
  return (
    <div className='flex flex-col gap-6' aria-label='Loading settings'>
      {/* Heading + subtitle */}
      <div>
        <Skeleton variant='text' size='lg' className='w-32' />
        <Skeleton variant='text' className='mt-2 w-56' />
      </div>

      {/* Profile section */}
      <Card>
        <CardHeader>
          <Skeleton width={120} height={20} />
        </CardHeader>
        <CardContent className='flex flex-col gap-4'>
          <Skeleton width='80%' size='sm' />
          <div className='grid gap-4 sm:grid-cols-2'>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className='flex flex-col gap-1'>
                <Skeleton width={80} size='sm' />
                <Skeleton variant='rectangular' height={36} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Email notifications section */}
      <Card>
        <CardHeader>
          <div className='flex items-center justify-between gap-3'>
            <Skeleton width={160} height={20} />
            <Skeleton variant='rectangular' width={80} height={24} />
          </div>
        </CardHeader>
        <CardContent className='flex flex-col gap-4'>
          <Skeleton width='70%' size='sm' />
          <div className='max-w-xs flex flex-col gap-1'>
            <Skeleton width={120} size='sm' />
            <Skeleton variant='rectangular' height={36} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
