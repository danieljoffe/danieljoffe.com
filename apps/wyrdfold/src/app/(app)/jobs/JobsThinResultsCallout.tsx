'use client';

import { useState } from 'react';
import { Card, CardContent } from '@danieljoffe.com/shared-ui/Card';
import { Text } from '@danieljoffe.com/shared-ui/Text';
import Button from '@/components/Button';
import { useToast } from '@/state/Toast/ToastProvider';

interface JobsThinResultsCalloutProps {
  jobsCount: number;
  targetLabel: string;
  /** Same hook ``JobsEmptyState`` uses — refresh the list after a
   *  manual add succeeds. */
  onJobAdded: () => void;
}

/**
 * Surfaced below the jobs table when an active target has a small
 * but non-empty job set (1–4 postings). The poller will keep
 * filling in matches over time, but a user staring at three jobs
 * may want to pad it themselves — this gives them the same
 * paste-URL affordance that ``JobsEmptyState`` offers, without
 * making them navigate away.
 *
 * Empty state (0 jobs) is owned by ``JobsEmptyState``; this
 * callout deliberately doesn't try to handle it.
 *
 * Uses ``window.prompt`` to match the codebase's existing add-job
 * pattern. A full modal isn't justified for one input.
 */
export default function JobsThinResultsCallout({
  jobsCount,
  targetLabel,
  onJobAdded,
}: JobsThinResultsCalloutProps) {
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  async function handleAdd() {
    // eslint-disable-next-line no-alert -- personal tool, native prompt matches the codebase
    const url = window.prompt('Paste a job posting URL:');
    const trimmed = url?.trim() ?? '';
    if (!trimmed) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/jobs/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: trimmed }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          detail?: string;
        } | null;
        toast({
          variant: 'error',
          title: body?.detail || `Could not add job (${res.status})`,
        });
        return;
      }
      toast({ variant: 'success', title: 'Job added' });
      onJobAdded();
    } catch {
      toast({ variant: 'error', title: 'Network error adding job' });
    } finally {
      setSubmitting(false);
    }
  }

  const jobsLabel = jobsCount === 1 ? 'posting' : 'postings';
  return (
    <Card>
      <CardContent className='flex flex-col items-center gap-3 py-8 text-center'>
        <Text variant='body' className='text-text-secondary'>
          {jobsCount} {jobsLabel} so far for{' '}
          <span className='text-text-primary'>{targetLabel}</span>. More may
          arrive as the poller runs — or paste a URL to add one yourself.
        </Text>
        <Button
          name='jobs-thin-results-add'
          variant='outline'
          size='sm'
          onClick={handleAdd}
          disabled={submitting}
        >
          {submitting ? 'Adding...' : 'Paste URL'}
        </Button>
      </CardContent>
    </Card>
  );
}
