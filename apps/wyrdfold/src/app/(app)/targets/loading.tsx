import { Card, CardContent } from '@danieljoffe.com/shared-ui/Card';
import { Skeleton } from '@danieljoffe.com/shared-ui/Skeleton';

export default function FittedTargetsLoading() {
  return (
    <div className='flex flex-col gap-6' aria-label='Loading targets'>
      <div className='flex items-center justify-between'>
        <Skeleton width={120} height={28} />
        <Skeleton variant='rectangular' width={110} height={36} />
      </div>
      <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} padding='none'>
            <CardContent className='flex flex-col gap-2.5 p-4'>
              <Skeleton width='70%' size='sm' />
              <hr className='-mx-4 border-border' />
              <Skeleton variant='text' lines={3} />
              <hr className='-mx-4 border-border' />
              <div className='flex justify-end'>
                <Skeleton width={60} size='sm' />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
