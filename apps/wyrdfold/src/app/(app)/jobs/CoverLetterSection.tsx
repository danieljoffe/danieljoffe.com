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

interface CoverLetterSectionProps {
  jobPostingId: string;
  companyName: string;
  roleTitle: string;
}

export default function CoverLetterSection({
  jobPostingId,
  companyName,
  roleTitle,
}: CoverLetterSectionProps) {
  const [record, setRecord] = useState<TailoredResumeRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const { toast } = useToast();

  const fetchCoverLetter = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/jobs/tailor/by-job/${jobPostingId}/cover-letter`
      );
      // The route returns 200 with a ``null`` body when no record
      // exists yet — see ``ResumeSection`` for the rationale.
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
    fetchCoverLetter();
  }, [fetchCoverLetter]);

  async function handleGenerate() {
    setGenerating(true);
    try {
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
          title: 'Job has no description — cannot tailor a cover letter.',
        });
        return;
      }

      const postTailor = () =>
        fetch('/api/jobs/tailor/cover-letter', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            job_description: jd,
            job_posting_id: jobPostingId,
            company_name: companyName,
            role_title: roleTitle,
          }),
        });

      let res = await postTailor();

      // Defensive fallback for the contact-name gate. See
      // ``promptForMissingContactName`` for which users still hit
      // this post-#703.
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
        // Same shape as ResumeSection: ``gap_gate`` is a structured 422
        // we surface specifically; everything else (string detail,
        // ``llm_budget_exceeded`` 429, unknown shapes) goes through
        // ``extractApiError``.
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
            title: await extractApiError(res, 'Cover letter generation failed'),
          });
        }
        return;
      }

      const data = (await res.json()) as TailorResponse;
      setRecord(data.record);
      toast({ variant: 'success', title: 'Cover letter generated' });
    } catch {
      toast({
        variant: 'error',
        title: 'Network error generating cover letter',
      });
    } finally {
      setGenerating(false);
    }
  }

  if (loading) {
    return (
      <div className='flex flex-col gap-2'>
        <div className='flex items-center gap-2'>
          <Text variant='caption'>Cover Letter</Text>
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
        : 'Generated';
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
        <Text variant='caption'>Cover Letter</Text>
        <Badge variant={statusVariant} size='sm'>
          {statusLabel}
        </Badge>
      </div>

      {generating ? (
        <div className='flex items-center gap-2'>
          <Spinner size='sm' />
          <Text variant='meta'>Generating cover letter...</Text>
        </div>
      ) : !record ? (
        <div>
          <Button
            name='generate-cover-letter'
            variant='secondary'
            size='sm'
            onClick={handleGenerate}
          >
            Generate Cover Letter
          </Button>
        </div>
      ) : (
        <div>
          <Button
            as='link'
            href={`/jobs/${jobPostingId}/cover-letter`}
            variant={isApproved ? 'secondary' : 'primary'}
            size='sm'
            name='review-cover-letter'
          >
            {isApproved ? 'View / Download' : 'Review Cover Letter'}
          </Button>
        </div>
      )}
    </div>
  );
}
