'use client';

import { useCallback, useEffect, useState } from 'react';
import { Badge } from '@danieljoffe.com/shared-ui/Badge';
import { Spinner } from '@danieljoffe.com/shared-ui/Spinner';
import { Text } from '@danieljoffe.com/shared-ui/Text';
import Button from '@/components/Button';
import { extractApiError } from '@/lib/extractApiError';
import { useToast } from '@/state/Toast/ToastProvider';
import { promptForMissingContactName } from './promptForMissingContactName';
import type { TailoredResumeRecord, TailorResponse } from './types';

interface ResumeSectionProps {
  jobPostingId: string;
  /** Compact pill mode — drops the caption/status-badge stack and renders
   *  just the action button (Generate / Review / View). Used in the inline
   *  preview panel's top toolbar where a full section would crowd the row. */
  compact?: boolean;
}

/**
 * Mirror of ``CoverLetterSection`` for the resume artifact. Distinguishes
 * "no record yet" → renders a Generate button, from "record exists" →
 * renders a Review (or View / Download for approved) button.
 *
 * The previous inline rendering inside ``JobDetailPanel`` always linked
 * to ``/jobs/{id}/resume`` regardless of whether a tailored doc actually
 * existed, leaving the user staring at a "Resume not found" dead-end
 * page with nowhere to generate one.
 */
export default function ResumeSection({
  jobPostingId,
  compact = false,
}: ResumeSectionProps) {
  const [record, setRecord] = useState<TailoredResumeRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const { toast } = useToast();

  const fetchResume = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/jobs/tailor/by-job/${jobPostingId}`);
      // The route returns 200 with a ``null`` body when no record
      // exists yet — see the route docstring in
      // ``wyrdfold-api/app/routers/tailor.py``. Treating ``null``
      // the same way the legacy 404 was treated (record = null →
      // render the Generate CTA) means the only observable change
      // is that the browser no longer logs a 404 to the console
      // on every job-detail visit before generation.
      if (!res.ok) return;
      const data = (await res.json()) as TailoredResumeRecord | null;
      setRecord(data);
    } catch {
      // Non-critical — silently fail on initial load
    } finally {
      setLoading(false);
    }
  }, [jobPostingId]);

  useEffect(() => {
    fetchResume();
  }, [fetchResume]);

  async function handleGenerate() {
    setGenerating(true);
    try {
      // The tailor route requires the JD text alongside ``job_posting_id``
      // — fetch it from the posting detail (description_html lives there
      // since PR #677). Cover letter doesn't need this because the
      // backend resolves the JD itself for that pipeline.
      const detailRes = await fetch(`/api/jobs/${jobPostingId}`);
      if (!detailRes.ok) {
        toast({ variant: 'error', title: 'Could not load job description' });
        return;
      }
      const detail = (await detailRes.json()) as {
        description_html: string | null;
      };
      const jd = (detail.description_html ?? '').trim();
      if (!jd) {
        toast({
          variant: 'error',
          title: 'Job has no description — cannot tailor a resume.',
        });
        return;
      }

      const postTailor = () =>
        fetch('/api/jobs/tailor/resume', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            job_description: jd,
            job_posting_id: jobPostingId,
          }),
        });

      let res = await postTailor();

      // Defensive fallback for the contact-name gate. Pre-#703 users,
      // users who skipped the onboarding Identity step, or users who
      // cleared their name in Settings still hit this. Prompt inline +
      // retry rather than dead-ending in Settings. See
      // ``promptForMissingContactName`` for the full rationale.
      if (!res.ok) {
        const peek = (await res
          .clone()
          .json()
          .catch(() => null)) as {
          detail?: { code?: string; message?: string } | string;
        } | null;
        const peekDetail =
          typeof peek?.detail === 'string' ? peek.detail : undefined;
        if (await promptForMissingContactName(peekDetail)) {
          res = await postTailor();
        }
      }

      if (!res.ok) {
        // ``gap_gate`` is a structured 422 with its own message string
        // we want to surface as-is — peek for it before falling back
        // to ``extractApiError`` (which handles plain detail strings
        // and the structured ``llm_budget_exceeded`` 429, but treats
        // ``gap_gate`` as a status-prefixed fallback). Order matters.
        const peek = (await res
          .clone()
          .json()
          .catch(() => null)) as {
          detail?: { code?: string; message?: string } | string;
        } | null;
        const peekDetail = peek?.detail;
        if (
          typeof peekDetail === 'object' &&
          peekDetail !== null &&
          peekDetail.code === 'gap_gate'
        ) {
          toast({
            variant: 'error',
            title:
              peekDetail.message ?? 'Master doc has gaps — update it first',
          });
        } else {
          toast({
            variant: 'error',
            title: await extractApiError(res, 'Resume generation failed'),
          });
        }
        return;
      }

      const data = (await res.json()) as TailorResponse;
      setRecord(data.record);
      toast({ variant: 'success', title: 'Resume drafted with AI' });
    } catch {
      toast({ variant: 'error', title: 'Network error generating resume' });
    } finally {
      setGenerating(false);
    }
  }

  if (loading) {
    if (compact) {
      return (
        <Button name='resume-loading' variant='secondary' size='sm' disabled>
          Resume…
        </Button>
      );
    }
    return (
      <div className='flex flex-col gap-2'>
        <div className='flex items-center gap-2'>
          <Text variant='caption'>Resume</Text>
          <Badge variant='default' size='sm'>
            Loading...
          </Badge>
        </div>
      </div>
    );
  }

  const isApproved = record?.approved_at != null;
  const statusLabel = generating
    ? 'Generating...'
    : !record
      ? 'Not started'
      : isApproved
        ? 'Approved'
        : 'Draft';
  const statusVariant = generating
    ? 'info'
    : !record
      ? 'default'
      : isApproved
        ? 'success'
        : 'info';

  // Compact mode: single button that conveys both state and action via its
  // label. No caption row, no status pill — the toolbar context handles
  // labeling and the button verb is enough ("Review Resume" implies a draft
  // exists; "Generate Resume" implies it doesn't).
  if (compact) {
    if (generating) {
      return (
        <Button name='resume-generating' variant='secondary' size='sm' disabled>
          <Spinner size='sm' aria-label='Generating resume' />
          <span>Generating…</span>
        </Button>
      );
    }
    if (!record) {
      return (
        <Button
          name='generate-resume'
          variant='primary'
          size='sm'
          onClick={handleGenerate}
        >
          Generate Resume
        </Button>
      );
    }
    return (
      <Button
        as='link'
        href={`/jobs/${jobPostingId}/resume`}
        variant={isApproved ? 'secondary' : 'primary'}
        size='sm'
        name={isApproved ? 'view-approved-resume' : 'review-resume'}
      >
        {isApproved ? 'View Resume' : 'Review Resume'}
      </Button>
    );
  }

  return (
    <div className='flex flex-col gap-2'>
      <div className='flex items-center gap-2'>
        <Text variant='caption'>Resume</Text>
        <Badge variant={statusVariant} size='sm'>
          {statusLabel}
        </Badge>
      </div>

      {generating ? (
        <div className='flex items-center gap-2'>
          <Spinner size='sm' />
          <Text variant='meta'>Generating resume...</Text>
        </div>
      ) : !record ? (
        <div>
          <Button
            name='generate-resume'
            variant='primary'
            size='sm'
            onClick={handleGenerate}
          >
            Generate Resume
          </Button>
        </div>
      ) : (
        <div>
          <Button
            as='link'
            href={`/jobs/${jobPostingId}/resume`}
            variant={isApproved ? 'secondary' : 'primary'}
            size='sm'
            name={isApproved ? 'view-approved-resume' : 'review-resume'}
          >
            {isApproved ? 'View / Download' : 'Review Resume'}
          </Button>
        </div>
      )}
    </div>
  );
}
