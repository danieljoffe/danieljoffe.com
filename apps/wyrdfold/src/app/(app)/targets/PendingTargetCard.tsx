'use client';

import { Card, CardContent } from '@danieljoffe/shared-ui/Card';
import { Skeleton } from '@danieljoffe/shared-ui/Skeleton';
import { Spinner } from '@danieljoffe/shared-ui/Spinner';

interface PendingTargetCardProps {
  /** Best-known title for this in-flight target. May be empty for URL mode. */
  label: string;
}

export default function PendingTargetCard({ label }: PendingTargetCardProps) {
  return (
    <Card
      padding='none'
      aria-busy='true'
      aria-live='polite'
      className='min-w-0'
    >
      <CardContent className='flex flex-col gap-2.5 p-4'>
        <header className='flex items-start justify-between gap-2'>
          <div className='flex min-w-0 flex-1 items-center gap-2'>
            {label ? (
              <span className='min-w-0 flex-1 truncate text-sm font-medium leading-tight text-text-primary'>
                {label}
              </span>
            ) : (
              <Skeleton width='70%' size='sm' />
            )}
          </div>
          <Spinner
            size='sm'
            aria-label='Creating target'
            className='shrink-0'
          />
        </header>

        <hr className='-mx-4 border-border' />

        <dl className='grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs'>
          <dt className='text-text-tertiary'>Categories</dt>
          <dd className='flex justify-end'>
            <Skeleton width={20} size='sm' />
          </dd>
          <dt className='text-text-tertiary'>Keywords</dt>
          <dd className='flex justify-end'>
            <Skeleton width={24} size='sm' />
          </dd>
          <dt className='text-text-tertiary'>Updated</dt>
          <dd className='flex justify-end'>
            <Skeleton width={70} size='sm' />
          </dd>
        </dl>

        <hr className='-mx-4 border-border' />

        <div className='flex justify-end'>
          <span className='inline-flex items-center gap-1.5 text-xs text-text-tertiary'>
            <Spinner size='sm' aria-label='Building scoring profile' />
            Building…
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
