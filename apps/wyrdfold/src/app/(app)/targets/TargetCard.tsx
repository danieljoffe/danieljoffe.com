'use client';

import { useRouter } from 'next/navigation';
import { Briefcase, MoreVertical, Power, Trash2 } from 'lucide-react';
import { Badge } from '@danieljoffe.com/shared-ui/Badge';
import { Card, CardContent } from '@danieljoffe.com/shared-ui/Card';
import { Dropdown } from '@danieljoffe.com/shared-ui/Dropdown';
import type { DropdownItem } from '@danieljoffe.com/shared-ui/Dropdown';
import { cn } from '@/lib/cn';
import type { JobTarget } from './types';

interface TargetCardProps {
  target: JobTarget;
  fitScore: number | null;
  fitScoreReasoning: string | null;
  onActivate: (id: string) => void;
  onDeactivate: (id: string) => void;
  onDelete: (id: string) => void;
  onViewJobs: (id: string) => void;
}

function countKeywords(target: JobTarget): number {
  return Object.values(target.scoring_profile.categories).reduce(
    (sum, cat) => sum + Object.keys(cat.keywords).length,
    0
  );
}

function fitScoreVariant(
  score: number
): 'success' | 'brand' | 'warning' | 'default' {
  if (score >= 85) return 'success';
  if (score >= 70) return 'brand';
  if (score >= 50) return 'warning';
  return 'default';
}

export default function TargetCard({
  target,
  fitScore,
  fitScoreReasoning,
  onActivate,
  onDeactivate,
  onDelete,
  onViewJobs,
}: TargetCardProps) {
  const router = useRouter();
  const detailHref = `/targets/${target.id}`;
  const categoryCount = Object.keys(target.scoring_profile.categories).length;
  const keywordCount = countKeywords(target);

  function handleNavigate() {
    router.push(detailHref);
  }

  const items: DropdownItem[] = [
    {
      label: 'View jobs',
      icon: <Briefcase className='size-4' aria-hidden />,
      onClick: () => onViewJobs(target.id),
      disabled: !target.is_active,
    },
    {
      label: target.is_active ? 'Deactivate' : 'Activate',
      icon: <Power className='size-4' aria-hidden />,
      onClick: () =>
        target.is_active ? onDeactivate(target.id) : onActivate(target.id),
    },
    { label: '', divider: true },
    {
      label: 'Delete',
      icon: <Trash2 className='size-4' aria-hidden />,
      danger: true,
      onClick: () => onDelete(target.id),
    },
  ];

  return (
    <Card padding='none' className='min-w-0'>
      <CardContent
        className={cn(
          'flex cursor-pointer flex-col gap-2.5 p-4 transition-colors',
          'hover:bg-surface-secondary',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2'
        )}
        onClick={handleNavigate}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleNavigate();
          }
        }}
        tabIndex={0}
        role='button'
        aria-label={`Open target ${target.label}`}
      >
        <header className='flex items-start justify-between gap-2'>
          <div className='flex min-w-0 flex-1 items-center gap-2'>
            {fitScore !== null && (
              <Badge
                variant={fitScoreVariant(fitScore)}
                size='sm'
                title={fitScoreReasoning ?? undefined}
                className='shrink-0'
              >
                {fitScore}
              </Badge>
            )}
            <span className='min-w-0 flex-1 truncate text-sm font-medium leading-tight text-text-primary'>
              {target.label}
            </span>
          </div>
          <div className='shrink-0' onClick={e => e.stopPropagation()}>
            <Dropdown
              trigger={
                <span className='inline-flex rounded p-1 text-text-secondary hover:bg-surface-tertiary hover:text-text-primary'>
                  <MoreVertical className='size-4' aria-hidden />
                </span>
              }
              items={items}
              align='right'
            />
          </div>
        </header>

        <hr className='-mx-4 border-border' />

        <dl className='grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs'>
          <dt className='text-text-tertiary'>Categories</dt>
          <dd className='text-right text-text-secondary'>{categoryCount}</dd>
          <dt className='text-text-tertiary'>Keywords</dt>
          <dd className='text-right text-text-secondary'>{keywordCount}</dd>
          <dt className='text-text-tertiary'>Updated</dt>
          <dd className='text-right text-text-secondary'>
            {new Date(target.updated_at).toLocaleDateString()}
          </dd>
        </dl>

        <hr className='-mx-4 border-border' />

        <div className='flex justify-end'>
          <span className='inline-flex items-center gap-1.5 text-xs text-text-secondary'>
            <span
              className={cn(
                'inline-block size-2 rounded-full',
                target.is_active ? 'bg-success' : 'bg-text-tertiary'
              )}
              aria-hidden
            />
            {target.is_active ? 'Active' : 'Inactive'}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
