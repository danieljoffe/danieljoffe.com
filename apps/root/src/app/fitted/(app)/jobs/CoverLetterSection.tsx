'use client';

import { useCallback, useEffect, useState } from 'react';
import { Badge } from '@danieljoffe.com/shared-ui/Badge';
import { Spinner } from '@danieljoffe.com/shared-ui/Spinner';
import { Text } from '@danieljoffe.com/shared-ui/Text';
import Button from '@/components/Button';
import { useToast } from '@/state/Toast/ToastProvider';
import type {
  CoverLetterPayload,
  TailoredResumeRecord,
  TailorResponse,
} from './types';

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
  const [expanded, setExpanded] = useState(false);
  const { toast } = useToast();

  const fetchCoverLetter = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/jobs/tailor/cover-letters');
      if (!res.ok) {
        setLoading(false);
        return;
      }
      const data = (await res.json()) as {
        cover_letters: TailoredResumeRecord[];
      };
      // Filter to find cover letters for this specific job posting
      const match = data.cover_letters.find(
        cl => cl.job_posting_id === jobPostingId
      );
      setRecord(match ?? null);
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
      setExpanded(true);
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

  async function handleDownload() {
    if (!record) return;
    try {
      const res = await fetch(`/api/jobs/tailor/${record.id}/download`);
      if (!res.ok) {
        toast({ variant: 'error', title: 'Download failed' });
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${companyName.replace(/\s+/g, '_')}_cover_letter.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast({
        variant: 'error',
        title: 'Network error downloading cover letter',
      });
    }
  }

  if (loading) {
    return (
      <div>
        <Text variant='caption' className='mb-1'>
          Cover Letter
        </Text>
        <div className='flex items-center gap-2 py-2'>
          <Spinner size='sm' />
          <Text variant='meta'>Loading...</Text>
        </div>
      </div>
    );
  }

  const payload = record ? (record.payload as CoverLetterPayload) : null;

  return (
    <div>
      <Text variant='caption' className='mb-1'>
        Cover Letter
      </Text>

      {!record && !generating && (
        <Button
          name='generate-cover-letter'
          variant='secondary'
          size='sm'
          onClick={handleGenerate}
        >
          Generate Cover Letter
        </Button>
      )}

      {generating && (
        <div className='flex items-center gap-2 py-2'>
          <Spinner size='sm' />
          <Text variant='meta'>Generating cover letter...</Text>
        </div>
      )}

      {record && payload && (
        <div className='space-y-2'>
          <div className='flex items-center gap-2'>
            <Badge variant='success' size='sm'>
              Generated
            </Badge>
            <Button
              name='toggle-cover-letter'
              variant='ghost'
              size='sm'
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? 'Collapse' : 'Expand'}
            </Button>
            <Button
              name='download-cover-letter'
              variant='secondary'
              size='sm'
              onClick={handleDownload}
            >
              Download .docx
            </Button>
            <Button
              name='regenerate-cover-letter'
              variant='outline'
              size='sm'
              onClick={handleGenerate}
              disabled={generating}
            >
              Regenerate
            </Button>
          </div>

          {/* Generation metadata */}
          {record.cost_usd > 0 && (
            <div className='flex flex-wrap gap-x-4 gap-y-1 rounded-md bg-surface-secondary px-3 py-2'>
              <Text variant='meta' as='span'>
                Cost: ${record.cost_usd.toFixed(4)}
              </Text>
              <Text variant='meta' as='span'>
                Tokens:{' '}
                {(record.input_tokens + record.output_tokens).toLocaleString()}
              </Text>
              {record.model && (
                <Text variant='meta' as='span'>
                  Model: {record.model}
                </Text>
              )}
              <Text variant='meta' as='span'>
                Latency: {(record.latency_ms / 1000).toFixed(1)}s
              </Text>
            </div>
          )}

          {/* Cover letter content */}
          {expanded && (
            <div className='rounded-md border border-border bg-surface p-4 space-y-3 max-h-[40vh] overflow-y-auto'>
              <Text variant='meta' className='text-text-secondary'>
                {payload.salutation}
              </Text>
              {payload.paragraphs.map((p, i) => (
                <Text key={i} variant='body'>
                  {p.text}
                </Text>
              ))}
              <Text variant='meta' className='text-text-secondary'>
                {payload.closing}
              </Text>
              <Text variant='meta' className='text-text-secondary'>
                {payload.signature}
              </Text>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
