'use client';

import { useCallback, useEffect, useState } from 'react';
import { Badge } from '@danieljoffe.com/shared-ui/Badge';
import { Spinner } from '@danieljoffe.com/shared-ui/Spinner';
import { Text } from '@danieljoffe.com/shared-ui/Text';
import Button from '@/components/Button';
import { useToast } from '@/state/Toast/ToastProvider';
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
    fetchCoverLetter();
  }, [fetchCoverLetter]);

  async function handleGenerate() {
    setGenerating(true);
    try {
      const res = await fetch('/api/jobs/tailor/cover-letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_posting_id: jobPostingId,
          company_name: companyName,
          role_title: roleTitle,
        }),
      });

      if (res.status === 422) {
        const err = (await res.json()) as {
          detail: { code: string | undefined; message: string | undefined };
        };
        if (err.detail?.code === 'gap_gate') {
          toast({
            variant: 'error',
            title:
              err.detail.message ?? 'Master doc has gaps — update it first',
          });
        } else {
          toast({ variant: 'error', title: 'Cover letter generation failed' });
        }
        return;
      }

      if (!res.ok) {
        toast({ variant: 'error', title: 'Failed to generate cover letter' });
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
