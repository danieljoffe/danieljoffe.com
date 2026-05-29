'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { Badge } from '@danieljoffe.com/shared-ui/Badge';
import { Card, CardContent } from '@danieljoffe.com/shared-ui/Card';
import { Heading } from '@danieljoffe.com/shared-ui/Heading';
import { Skeleton } from '@danieljoffe.com/shared-ui/Skeleton';
import { Text } from '@danieljoffe.com/shared-ui/Text';
import Button from '@/components/Button';
import { extractApiError } from '@/lib/extractApiError';
import { useToast } from '@/state/Toast/ToastProvider';
import type { UserTargetWithTarget } from '../../targets/types';
import JobDetailPanel from '../JobDetailPanel';
import { MANUAL_SOURCE_ID, type JobPosting } from '../types';

interface JobDetailPageProps {
  id: string;
  targetId: string | undefined;
}

export default function JobDetailPage({ id, targetId }: JobDetailPageProps) {
  const [posting, setPosting] = useState<JobPosting | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [fallbackTargetId, setFallbackTargetId] = useState<string | undefined>(
    undefined
  );
  const router = useRouter();
  const { toast } = useToast();

  // Reflect the 404 state in the tab title so the browser tab/history
  // doesn't read "Job Detail | WyrdFold" for a job that doesn't exist.
  useEffect(() => {
    if (!notFound) return;
    const previousTitle = document.title;
    document.title = 'Job not found | WyrdFold';
    return () => {
      document.title = previousTitle;
    };
  }, [notFound]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`/api/jobs/${id}`);
        if (res.status === 404) {
          if (!cancelled) setNotFound(true);
          return;
        }
        if (!res.ok)
          throw new Error(await extractApiError(res, 'Failed to load job'));
        const data = (await res.json()) as JobPosting;
        if (!cancelled) setPosting(data);
      } catch (err) {
        if (!cancelled)
          toast({
            variant: 'error',
            title: err instanceof Error ? err.message : 'Failed to load job',
          });
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [id, toast]);

  // Fallback: when the URL has no ?target=, pick the user's first active
  // target so LLM analysis still runs. The master-doc cache key keeps this
  // cheap on revisits.
  useEffect(() => {
    if (targetId) return;
    let cancelled = false;
    async function loadTargets() {
      try {
        const res = await fetch('/api/targets/mine');
        if (!res.ok) return;
        const { targets } = (await res.json()) as {
          targets: UserTargetWithTarget[];
        };
        const first = targets.find(t => t.user_target.is_active);
        if (!cancelled && first) setFallbackTargetId(first.target.id);
      } catch {
        // Non-critical — analysis section just won't auto-trigger
      }
    }
    loadTargets();
    return () => {
      cancelled = true;
    };
  }, [targetId]);

  const handleStatusChange = useCallback((newStatus: string) => {
    setPosting(prev => (prev ? { ...prev, status: newStatus } : prev));
  }, []);

  // Re-fetch the posting after the LLM analysis blend writes the new
  // per-target score + flips ``scoring_status`` to ``complete``. The
  // panel's ``onAnalysisComplete`` calls this; without it the Score
  // badge stays at the keyword-only number (e.g. 70+ → 20 blend stayed
  // visually at 70+ until the user manually refreshed).
  const refetchPosting = useCallback(async () => {
    try {
      const res = await fetch(`/api/jobs/${id}`);
      if (!res.ok) return;
      const data = (await res.json()) as JobPosting;
      setPosting(data);
    } catch {
      // Best-effort — the analysis result is already shown; the stale
      // score is the worst case, and refreshing the page recovers.
    }
  }, [id]);

  const handleDelete = useCallback(async () => {
    if (!posting) return;
    /* eslint-disable no-alert -- personal tool, native confirm is fine */
    if (
      !window.confirm(`Delete "${posting.title}" from ${posting.company_name}?`)
    )
      /* eslint-enable no-alert */
      return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/jobs/${posting.id}`, { method: 'DELETE' });
      if (res.ok) {
        toast({ variant: 'success', title: 'Job deleted' });
        router.push('/jobs');
      } else {
        toast({ variant: 'error', title: 'Failed to delete job' });
        setDeleting(false);
      }
    } catch {
      toast({ variant: 'error', title: 'Failed to delete job' });
      setDeleting(false);
    }
  }, [posting, router, toast]);

  if (loading) {
    return (
      <div className='flex flex-col gap-6' aria-label='Loading job'>
        <div className='flex items-start gap-3'>
          <Skeleton variant='rectangular' width={32} height={32} />
          <div className='flex-1 min-w-0 flex flex-col gap-2'>
            <div className='flex items-center gap-2'>
              <Skeleton width='60%' size='lg' />
              <Skeleton variant='rectangular' width={32} height={32} />
            </div>
            <Skeleton width='30%' size='sm' />
            <Skeleton width='25%' size='sm' />
            <Skeleton width='20%' size='sm' />
          </div>
        </div>
        <Card padding='none'>
          <CardContent className='flex flex-col gap-4 p-4'>
            <div>
              <Skeleton width={60} size='sm' className='mb-1' />
              <div className='flex items-center justify-between gap-3'>
                <Skeleton variant='rectangular' width={140} height={32} />
                <Skeleton variant='rectangular' width={80} height={24} />
              </div>
            </div>
            <div>
              <Skeleton width={120} size='sm' className='mb-2' />
              <Skeleton variant='text' lines={3} />
            </div>
            <div>
              <Skeleton width={80} size='sm' className='mb-1' />
              <Skeleton variant='text' lines={2} />
            </div>
          </CardContent>
        </Card>
        <div className='flex justify-center pt-2'>
          <Skeleton variant='rectangular' width={120} height={32} />
        </div>
      </div>
    );
  }

  if (notFound || !posting) {
    return (
      <div className='flex flex-col gap-6'>
        <div className='flex items-center gap-3'>
          <Link
            href='/jobs'
            className='p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-tertiary transition-colors'
            aria-label='Back to jobs'
          >
            <ArrowLeft className='size-5' aria-hidden />
          </Link>
          <Heading variant='hero' as='h1'>
            Job not found
          </Heading>
        </div>
        <Card>
          <CardContent className='py-12 text-center'>
            <Text variant='body'>
              This job may have been deleted or the link is incorrect.
            </Text>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isManual = posting.source_id === MANUAL_SOURCE_ID;

  return (
    <div className='flex flex-col gap-6'>
      <div className='flex items-start gap-3'>
        <Link
          href='/jobs'
          className='mt-1 p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-tertiary transition-colors'
          aria-label='Back to jobs'
        >
          <ArrowLeft className='size-5' aria-hidden />
        </Link>
        <div className='flex-1 min-w-0'>
          <div className='flex items-center gap-2 min-w-0'>
            <Heading
              variant='component'
              as='h1'
              className='flex-1 min-w-0 truncate'
              title={posting.title}
            >
              {posting.title}
            </Heading>
            {posting.absolute_url && (
              <a
                href={posting.absolute_url}
                target='_blank'
                rel='noopener noreferrer'
                className='shrink-0 p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-tertiary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500'
                aria-label='View original posting'
              >
                <ExternalLink className='size-5' aria-hidden />
              </a>
            )}
          </div>
          <div className='mt-1 flex flex-col gap-0.5 text-text-secondary'>
            <div className='flex flex-wrap items-center gap-2'>
              <Text variant='caption' className='text-text-secondary'>
                {posting.company_name}
              </Text>
              {isManual && (
                <Badge variant='default' size='sm'>
                  Manual
                </Badge>
              )}
            </div>
            {posting.salary_text && (
              <Text variant='caption' className='text-text-secondary'>
                {posting.salary_text}
              </Text>
            )}
            {posting.location && (
              <Text variant='caption' className='text-text-secondary'>
                {posting.location}
              </Text>
            )}
          </div>
        </div>
      </div>

      <Card padding='none'>
        <JobDetailPanel
          posting={posting}
          targetId={targetId ?? fallbackTargetId}
          viewFullHref={undefined}
          onDelete={undefined}
          onStatusChange={handleStatusChange}
          onAnalysisComplete={refetchPosting}
          hideDelete
          defaultDescriptionOpen
        />
      </Card>

      <div className='flex justify-center pt-2'>
        <Button
          name='delete-posting'
          variant='error'
          size='sm'
          onClick={handleDelete}
          disabled={deleting}
        >
          {deleting ? 'Deleting...' : 'Delete posting'}
        </Button>
      </div>
    </div>
  );
}
