import { Suspense } from 'react';
import type { Metadata } from 'next';
import { Heading } from '@danieljoffe.com/shared-ui/Heading';
import { Text } from '@danieljoffe.com/shared-ui/Text';
import { Card, CardContent } from '@danieljoffe.com/shared-ui/Card';
import { Skeleton } from '@danieljoffe.com/shared-ui/Skeleton';
import { fetchJsonFromWyrdfoldAPI } from '@/lib/api/proxy';
import TargetsList from './TargetsList';
import type { UserTargetWithTarget } from './types';

export const metadata: Metadata = {
  title: 'Targets',
};

export default function FittedTargetsPage() {
  return (
    <div className='flex flex-col gap-6'>
      <div>
        <Heading variant='hero' as='h1'>
          Targets
        </Heading>
        <Text variant='body' className='mt-1 text-text-secondary'>
          Role profiles you score new jobs against
        </Text>
      </div>
      <Suspense fallback={<TargetsCardsSkeleton />}>
        <TargetsLoader />
      </Suspense>
    </div>
  );
}

async function TargetsLoader() {
  const res = await fetchJsonFromWyrdfoldAPI<{
    targets: UserTargetWithTarget[];
  }>('/targets/mine');
  const initialTargets = res?.targets ?? [];
  return <TargetsList initialTargets={initialTargets} />;
}

function TargetsCardsSkeleton() {
  return (
    <div className='flex flex-col gap-6' aria-label='Loading targets'>
      <div className='flex justify-end'>
        <Skeleton variant='rectangular' width={36} height={36} />
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
