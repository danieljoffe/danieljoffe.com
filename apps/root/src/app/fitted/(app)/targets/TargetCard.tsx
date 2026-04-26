'use client';

import Link from 'next/link';
import { Badge } from '@danieljoffe.com/shared-ui/Badge';
import { Card, CardContent } from '@danieljoffe.com/shared-ui/Card';
import { Heading } from '@danieljoffe.com/shared-ui/Heading';
import { Text } from '@danieljoffe.com/shared-ui/Text';
import Button from '@/components/Button';
import type { JobTarget } from './types';

interface TargetCardProps {
  target: JobTarget;
  onActivate: (id: string) => void;
  onDelete: (id: string) => void;
  onViewJobs: (id: string) => void;
}

function countKeywords(target: JobTarget): number {
  return Object.values(target.scoring_profile.categories).reduce(
    (sum, cat) => sum + Object.keys(cat.keywords).length,
    0
  );
}

export default function TargetCard({
  target,
  onActivate,
  onDelete,
  onViewJobs,
}: TargetCardProps) {
  const categoryCount = Object.keys(target.scoring_profile.categories).length;
  const keywordCount = countKeywords(target);

  return (
    <Card padding='none'>
      <CardContent className='p-4 flex flex-col gap-3'>
        <div className='flex items-start justify-between gap-2'>
          <Link
            href={`/fitted/targets/${target.id}`}
            className='hover:underline'
          >
            <Heading variant='cardTitle' as='h3'>
              {target.label}
            </Heading>
          </Link>
          {target.is_active && (
            <Badge variant='brand-solid' size='sm'>
              Active
            </Badge>
          )}
        </div>

        <div className='flex flex-wrap gap-x-4 gap-y-1'>
          <Text variant='caption' as='span'>
            {categoryCount} {categoryCount === 1 ? 'category' : 'categories'}
          </Text>
          <Text variant='caption' as='span'>
            {keywordCount} {keywordCount === 1 ? 'keyword' : 'keywords'}
          </Text>
        </div>

        <Text variant='meta' as='p'>
          Updated {new Date(target.updated_at).toLocaleDateString()}
        </Text>

        <div className='flex items-center gap-2 pt-1'>
          <Button
            name={`target-view-jobs-${target.id}`}
            variant='primary'
            size='sm'
            onClick={() => onViewJobs(target.id)}
          >
            View Jobs
          </Button>
          {!target.is_active && (
            <Button
              name={`target-activate-${target.id}`}
              variant='outline'
              size='sm'
              onClick={() => onActivate(target.id)}
            >
              Activate
            </Button>
          )}
          <Button
            name={`target-delete-${target.id}`}
            variant='outline'
            size='sm'
            onClick={() => onDelete(target.id)}
            className='text-error hover:bg-error/10'
          >
            Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
