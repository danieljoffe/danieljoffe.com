'use client';

import { useRouter } from 'next/navigation';
import { Briefcase, MoreVertical, Power, Trash2 } from 'lucide-react';
import { Badge } from '@danieljoffe.com/shared-ui/Badge';
import { Card, CardContent } from '@danieljoffe.com/shared-ui/Card';
import { Dropdown } from '@danieljoffe.com/shared-ui/Dropdown';
import type { DropdownItem } from '@danieljoffe.com/shared-ui/Dropdown';
import { Spinner } from '@danieljoffe.com/shared-ui/Spinner';
import { cn } from '@/lib/cn';
import type { JobTarget } from './types';

interface TargetCardProps {
  target: JobTarget;
  /**
   * THIS user's active flag for the target — read from
   * ``user_targets.is_active``. ``isActive`` is the shared
   * catalog flag synced by a DB trigger from any user's active
   * link, so it can read ``true`` even when this user has the
   * target deactivated. Reading the catalog flag for per-user UX
   * (View jobs disabled, Activate/Deactivate label, status badge)
   * made the dropdown's "View jobs" click-through to
   * ``/jobs?target=...``, which then server-side-redirected to
   * the untargeted view because the page filters by
   * ``user_isActive``. User clicked, ended up nowhere
   * useful, with no explanation.
   */
  isActive: boolean;
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
  isActive,
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
  // The scoring profile + fit score are derived in a backend BackgroundTask
  // after creation, so a freshly-added target shows up here before its
  // profile exists. ``deriving`` drives the pending UI; ``failed`` surfaces
  // a derivation error so the card isn't stuck spinning forever.
  const deriving = target.activation_status === 'deriving';
  const failed = target.activation_status === 'error';

  function handleNavigate() {
    router.push(detailHref);
  }

  const items: DropdownItem[] = [
    {
      label: 'View jobs',
      icon: <Briefcase className='size-4' aria-hidden />,
      onClick: () => onViewJobs(target.id),
      // No jobs to view until the target is active *and* its profile exists.
      disabled: !isActive || deriving,
    },
    {
      label: isActive ? 'Deactivate' : 'Activate',
      icon: <Power className='size-4' aria-hidden />,
      onClick: () =>
        isActive ? onDeactivate(target.id) : onActivate(target.id),
      // Activating runs the poll pipeline against the scoring profile — wait
      // for derivation to finish before it can be activated.
      disabled: deriving && !isActive,
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
          <dd className='text-right text-text-secondary'>
            {deriving ? '—' : categoryCount}
          </dd>
          <dt className='text-text-tertiary'>Keywords</dt>
          <dd className='text-right text-text-secondary'>
            {deriving ? '—' : keywordCount}
          </dd>
          <dt className='text-text-tertiary'>Updated</dt>
          <dd className='text-right text-text-secondary'>
            {new Date(target.updated_at).toLocaleDateString()}
          </dd>
        </dl>

        <hr className='-mx-4 border-border' />

        <div className='flex justify-end' aria-live='polite'>
          {deriving ? (
            <span className='inline-flex items-center gap-1.5 text-xs text-text-secondary'>
              <Spinner size='sm' aria-label='Building scoring profile' />
              Building…
            </span>
          ) : failed ? (
            <span className='inline-flex items-center gap-1.5 text-xs text-error'>
              <span
                className='inline-block size-2 rounded-full bg-error'
                aria-hidden
              />
              Derivation failed
            </span>
          ) : (
            <span className='inline-flex items-center gap-1.5 text-xs text-text-secondary'>
              <span
                className={cn(
                  'inline-block size-2 rounded-full',
                  isActive ? 'bg-success' : 'bg-text-tertiary'
                )}
                aria-hidden
              />
              {isActive ? 'Active' : 'Inactive'}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
