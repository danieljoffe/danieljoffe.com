'use client';

import { useState } from 'react';
import { Text } from '@danieljoffe/shared-ui/Text';
import Button from '@/components/Button';
import { extractApiError } from '@/lib/extractApiError';
import { useToast } from '@/state/Toast/ToastProvider';

interface JobsEmptyStateProps {
  /**
   * Notify the parent table that a job was added so it can refresh. The
   * parent owns the fetch hook + page state — this component shouldn't
   * try to mutate it directly.
   */
  onJobAdded: () => void;
}

/**
 * Shared empty state for the jobs list (desktop table + mobile cards).
 *
 * Was a static line of text saying "No jobs found. Try adjusting filters
 * or adding jobs manually." — but ``/jobs`` had no actual UI affordance
 * for adding a job manually; the API endpoint (POST /jobs/manual) was
 * only reachable from the onboarding wizard. Users finishing onboarding
 * with the suggest path landed on an empty Top Matches block and had
 * no way to seed one.
 *
 * Surface a Paste URL CTA right where the user is already looking.
 * Uses ``window.prompt`` to match the codebase's existing pattern
 * (delete-job confirm, contact-name prompt) — a full modal isn't
 * justified for what amounts to one input.
 */
export default function JobsEmptyState({ onJobAdded }: JobsEmptyStateProps) {
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
        toast({
          variant: 'error',
          title: await extractApiError(res, 'Could not add job'),
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

  return (
    <div className='flex flex-col items-center gap-3 py-12 text-center'>
      <Text variant='body' className='text-text-tertiary'>
        No jobs found. Try adjusting filters, or paste a posting URL to add one
        manually.
      </Text>
      <Button
        name='jobs-add-manual'
        variant='outline'
        size='sm'
        onClick={handleAdd}
        disabled={submitting}
      >
        {submitting ? 'Adding...' : 'Paste URL'}
      </Button>
    </div>
  );
}
