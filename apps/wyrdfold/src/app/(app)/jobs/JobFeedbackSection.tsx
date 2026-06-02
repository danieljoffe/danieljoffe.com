'use client';

import { useState } from 'react';
import { Info, ThumbsDown, ThumbsUp } from 'lucide-react';
import { Text } from '@danieljoffe.com/shared-ui/Text';
import Button from '@/components/Button';
import { useToast } from '@/state/Toast/ToastProvider';

interface JobFeedbackSectionProps {
  jobId: string;
  targetId: string;
}

// Relevance-feedback affordance on the job detail panel. Divider +
// (i) icon above the section make it discoverable — the section
// controls a real learning loop (auto-mutates the target's negative
// keywords + re-scores in the background), not just an "I liked it"
// reaction, so the explanation matters.
//
// Two buttons (thumbs up / down). Clicking expands an optional reason
// textarea; the signal POSTs regardless of whether the user types a
// reason. Backend (PR #772) accepts an empty `reason` and the v1
// learner only acts on N≥3 reasons sharing a literal token; the v2
// LLM learner consumes the same rows once enough are queued.
export default function JobFeedbackSection({
  jobId,
  targetId,
}: JobFeedbackSectionProps) {
  const { toast } = useToast();
  const [activeSignal, setActiveSignal] = useState<
    'irrelevant' | 'relevant' | null
  >(null);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [lastSubmittedSignal, setLastSubmittedSignal] = useState<
    'irrelevant' | 'relevant' | null
  >(null);
  const [showInfo, setShowInfo] = useState(false);

  async function submit(signal: 'irrelevant' | 'relevant', reasonText: string) {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signal,
          reason: reasonText.trim() || null,
          target_id: targetId,
        }),
      });
      if (!res.ok) {
        toast({
          variant: 'error',
          title:
            signal === 'irrelevant'
              ? 'Failed to mark as irrelevant'
              : 'Failed to mark as relevant',
        });
        return;
      }
      setLastSubmittedSignal(signal);
      setActiveSignal(null);
      setReason('');
      toast({
        variant: 'success',
        title:
          signal === 'irrelevant'
            ? 'Marked irrelevant — similar jobs will be deprioritized'
            : 'Marked as highly relevant',
      });
    } catch {
      toast({ variant: 'error', title: 'Network error sending feedback' });
    } finally {
      setSubmitting(false);
    }
  }

  async function undo() {
    if (!lastSubmittedSignal) return;
    try {
      const res = await fetch(
        `/api/jobs/${jobId}/feedback?target_id=${encodeURIComponent(targetId)}`,
        { method: 'DELETE' }
      );
      if (res.ok) {
        setLastSubmittedSignal(null);
        toast({ variant: 'success', title: 'Feedback removed' });
      } else {
        toast({ variant: 'error', title: 'Failed to undo' });
      }
    } catch {
      toast({ variant: 'error', title: 'Network error undoing feedback' });
    }
  }

  const header = (
    <div className='mb-2 flex items-center gap-1'>
      <Text variant='caption'>Feedback</Text>
      <button
        type='button'
        onClick={() => setShowInfo(open => !open)}
        aria-label='About feedback'
        aria-expanded={showInfo}
        title='About feedback'
        className='inline-flex h-5 w-5 items-center justify-center rounded text-text-tertiary hover:bg-surface-tertiary hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500'
      >
        <Info className='h-3.5 w-3.5' aria-hidden />
      </button>
    </div>
  );

  const infoPanel = showInfo ? (
    <div
      role='region'
      aria-label='How feedback works'
      className='mb-3 rounded-md border border-border bg-surface-secondary p-3'
    >
      <Text variant='meta' className='text-text-secondary'>
        Your feedback affects how we grade jobs for this target. We learn
        from patterns across your marks — when several jobs share an
        irrelevant token we auto-add it to the target&rsquo;s negative
        keywords and re-score the list in the background. You can also
        manually edit the target&rsquo;s scoring profile from Settings.
      </Text>
    </div>
  ) : null;

  return (
    <section className='border-t border-border pt-4'>
      {header}
      {infoPanel}
      {activeSignal !== null ? (
        <div className='flex flex-col gap-2 rounded-md border border-border bg-surface-secondary p-2'>
          <Text variant='meta' as='label' className='text-text-secondary'>
            {activeSignal === 'irrelevant'
              ? 'Why is this irrelevant? (optional, e.g. "sales role")'
              : 'What stood out? (optional)'}
          </Text>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            maxLength={500}
            rows={2}
            aria-label='Feedback reason'
            className='w-full rounded border border-border bg-surface px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500'
            autoFocus
          />
          <div className='flex justify-end gap-2'>
            <Button
              name='feedback-skip'
              variant='ghost'
              size='sm'
              onClick={() => {
                setActiveSignal(null);
                setReason('');
              }}
              disabled={submitting}
            >
              Skip
            </Button>
            <Button
              name='feedback-submit'
              variant='primary'
              size='sm'
              onClick={() => submit(activeSignal, reason)}
              disabled={submitting}
            >
              {submitting ? 'Sending…' : 'Submit'}
            </Button>
          </div>
        </div>
      ) : (
        <div className='flex items-center gap-2'>
          <Button
            name='feedback-not-for-me'
            variant='secondary'
            size='sm'
            onClick={() => setActiveSignal('irrelevant')}
            aria-pressed={lastSubmittedSignal === 'irrelevant'}
          >
            <ThumbsDown className='size-4' aria-hidden />
            <span className='ml-1'>Not for me</span>
          </Button>
          <Button
            name='feedback-great-match'
            variant='secondary'
            size='sm'
            onClick={() => setActiveSignal('relevant')}
            aria-pressed={lastSubmittedSignal === 'relevant'}
          >
            <ThumbsUp className='size-4' aria-hidden />
            <span className='ml-1'>Great match</span>
          </Button>
          {lastSubmittedSignal !== null && (
            <Button
              name='feedback-undo'
              variant='ghost'
              size='sm'
              onClick={undo}
            >
              Undo
            </Button>
          )}
        </div>
      )}
    </section>
  );
}
