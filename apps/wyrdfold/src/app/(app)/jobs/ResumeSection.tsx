'use client';

import { useCallback, useEffect, useState } from 'react';
import { Badge } from '@danieljoffe.com/shared-ui/Badge';
import { Spinner } from '@danieljoffe.com/shared-ui/Spinner';
import { Text } from '@danieljoffe.com/shared-ui/Text';
import Button from '@/components/Button';
import { useToast } from '@/state/Toast/ToastProvider';
import { promptForMissingContactName } from './promptForMissingContactName';
import type { TailoredResumeRecord, TailorResponse } from './types';

interface ResumeSectionProps {
  jobPostingId: string;
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
export default function ResumeSection({ jobPostingId }: ResumeSectionProps) {
  const [record, setRecord] = useState<TailoredResumeRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const { toast } = useToast();

  const fetchResume = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/jobs/tailor/by-job/${jobPostingId}`);
      if (res.status === 404) {
        setRecord(null);
        return;
      }
      if (!res.ok) return;
      const data = (await res.json()) as TailoredResumeRecord;
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

      // The onboarding wizard doesn't capture a contact name (Supabase
      // magic-link auth has none), so first-time users hit the 400
      // "No contact name on file" gate. Prompt for it inline + retry
      // rather than dead-ending in Settings.
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
        // The 422 case carries a structured ``detail`` object for the
        // gap-gate failure mode (so it can show ``message`` + percent /
        // tier in a future enhancement); other failures (400 ``no
        // contact name on file``, 404 ``no optimized doc``, 503, etc.)
        // carry a plain ``detail`` string. Surface the actual cause
        // instead of a generic "failed" — chasing the wrong cause is
        // exactly what the analysis-panel fix in #677 addressed.
        const body = (await res.json().catch(() => null)) as {
          detail?: { code?: string; message?: string } | string;
        } | null;
        const detail = body?.detail;
        if (
          typeof detail === 'object' &&
          detail !== null &&
          detail.code === 'gap_gate'
        ) {
          toast({
            variant: 'error',
            title: detail.message ?? 'Master doc has gaps — update it first',
          });
        } else if (typeof detail === 'string' && detail.trim()) {
          toast({ variant: 'error', title: detail });
        } else {
          toast({
            variant: 'error',
            title: `Resume generation failed (${res.status})`,
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
