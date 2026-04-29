'use client';

import { Card, CardContent } from '@danieljoffe.com/shared-ui/Card';
import { Heading } from '@danieljoffe.com/shared-ui/Heading';
import { Skeleton } from '@danieljoffe.com/shared-ui/Skeleton';
import { Spinner } from '@danieljoffe.com/shared-ui/Spinner';
import { Text } from '@danieljoffe.com/shared-ui/Text';

interface PendingTargetCardProps {
  /** Best-known title for this in-flight target. May be empty for URL mode. */
  label: string;
}

export default function PendingTargetCard({ label }: PendingTargetCardProps) {
  return (
    <Card padding='none' aria-busy='true' aria-live='polite'>
      <CardContent className='p-4 flex flex-col gap-3'>
        <div className='flex items-start justify-between gap-2'>
          {label ? (
            <Heading variant='cardTitle' as='h3'>
              {label}
            </Heading>
          ) : (
            <Skeleton width='70%' size='lg' />
          )}
          <div className='flex items-center gap-1.5'>
            <Spinner size='sm' aria-label='Creating target' />
          </div>
        </div>

        <div className='flex gap-4'>
          <Skeleton width={90} size='sm' />
          <Skeleton width={80} size='sm' />
        </div>

        <Text variant='meta' as='p' className='text-text-secondary'>
          Building scoring profile…
        </Text>

        <div className='flex gap-2 pt-1'>
          <Skeleton variant='rectangular' width={80} height={32} />
          <Skeleton variant='rectangular' width={80} height={32} />
        </div>
      </CardContent>
    </Card>
  );
}
