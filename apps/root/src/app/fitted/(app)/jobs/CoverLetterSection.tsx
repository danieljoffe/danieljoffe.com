'use client';

import { useCallback, useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, Download, RotateCcw } from 'lucide-react';
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

function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .normalize('NFKD')
      .replace(/\p{Diacritic}/gu, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'cover-letter'
  );
}

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
      const payload = record.payload as CoverLetterPayload;
      const userSlug = slugify(payload.contact.name);
      const companySlug = slugify(companyName);
      const date = new Date().toISOString().slice(0, 10);
      a.download = `${userSlug}-${companySlug}-cover-letter-${date}.docx`;
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
      <div className='mb-1 flex items-center justify-between gap-2'>
        <Text variant='caption' as='span'>
          Cover Letter
        </Text>
        {record && payload && (
          <div className='flex items-center gap-1'>
            <Button
              name='toggle-cover-letter'
              variant='ghost'
              size='sm'
              iconOnly
              aria-label={
                expanded ? 'Collapse cover letter' : 'Expand cover letter'
              }
              aria-expanded={expanded}
              title={expanded ? 'Collapse' : 'Expand'}
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? (
                <ChevronUp className='h-4 w-4' aria-hidden='true' />
              ) : (
                <ChevronDown className='h-4 w-4' aria-hidden='true' />
              )}
            </Button>
            <Button
              name='download-cover-letter'
              variant='ghost'
              size='sm'
              iconOnly
              aria-label='Download cover letter as .docx'
              title='Download .docx'
              onClick={handleDownload}
              disabled={generating}
            >
              <Download className='h-4 w-4' aria-hidden='true' />
            </Button>
            <Button
              name='regenerate-cover-letter'
              variant='ghost'
              size='sm'
              iconOnly
              aria-label='Regenerate cover letter with AI'
              title='Regenerate with AI'
              onClick={handleGenerate}
              disabled={generating}
            >
              <RotateCcw className='h-4 w-4' aria-hidden='true' />
            </Button>
          </div>
        )}
      </div>

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
          <Badge variant='success' size='sm'>
            Generated
          </Badge>

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
