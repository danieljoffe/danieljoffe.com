'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { ExternalLink, CheckCircle, Briefcase } from 'lucide-react';
import { Card } from '@danieljoffe.com/shared-ui/Card';
import { Text } from '@danieljoffe.com/shared-ui/Text';
import { Heading } from '@danieljoffe.com/shared-ui/Heading';
import { Input } from '@danieljoffe.com/shared-ui/Input';
import { Spinner } from '@danieljoffe.com/shared-ui/Spinner';
import { Alert } from '@danieljoffe.com/shared-ui/Alert';
import Button from '@/components/Button';
import { extractApiError } from '@/lib/extractApiError';

export interface JobData {
  postingId: string;
  title: string | null;
}

interface JobUrlInputProps {
  onComplete: (data?: JobData) => void;
  onSkip: () => void;
}

interface ExtractedJob {
  title: string | null;
  company_name: string | null;
  posting_id: string | null;
}

export default function JobUrlInput({ onComplete, onSkip }: JobUrlInputProps) {
  const [url, setUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extracted, setExtracted] = useState<ExtractedJob | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = url.trim();
      if (!trimmed) return;

      setError(null);
      setSubmitting(true);

      try {
        const res = await fetch('/api/jobs/manual', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: trimmed }),
        });

        if (!res.ok) {
          throw new Error(await extractApiError(res, 'Failed to add job'));
        }

        const data = (await res.json()) as {
          success: boolean;
          posting_id: string | null;
          extracted: { title: string | null; company_name: string | null };
        };

        setExtracted({
          title: data.extracted?.title ?? null,
          company_name: data.extracted?.company_name ?? null,
          posting_id: data.posting_id,
        });

        const jobData = data.posting_id
          ? { postingId: data.posting_id, title: data.extracted?.title ?? null }
          : undefined;
        timerRef.current = setTimeout(() => onComplete(jobData), 1500);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Failed to add job. Please try again.'
        );
      } finally {
        setSubmitting(false);
      }
    },
    [url, onComplete]
  );

  return (
    <div className='flex flex-col gap-6'>
      <div className='text-center'>
        <Heading variant='cardTitle' as='h2'>
          Add your first job
        </Heading>
        <Text variant='caption' className='mt-1 text-text-secondary'>
          Paste a job posting URL and we&apos;ll extract the details.
        </Text>
      </div>

      {extracted ? (
        <Card padding='lg'>
          <div className='flex flex-col items-center gap-3 py-4'>
            <CheckCircle className='size-12 text-success' aria-hidden />
            <div className='text-center'>
              <Text variant='body' className='font-medium'>
                {extracted.title ?? 'Job added'}
              </Text>
              {extracted.company_name && (
                <Text variant='caption' className='mt-1 text-text-secondary'>
                  at {extracted.company_name}
                </Text>
              )}
            </div>
          </div>
        </Card>
      ) : (
        <Card padding='lg'>
          <form onSubmit={handleSubmit} className='flex flex-col gap-4'>
            <div className='flex items-center gap-3'>
              <div className='rounded-lg bg-surface-tertiary p-2'>
                <Briefcase className='size-5 text-text-secondary' aria-hidden />
              </div>
              <div className='flex-1'>
                <Input
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  placeholder='https://jobs.example.com/posting/...'
                  type='url'
                  disabled={submitting}
                  aria-label='Job posting URL'
                  data-sentry-mask
                />
              </div>
            </div>
            <Button
              name='onboarding-add-job'
              variant='primary'
              type='submit'
              disabled={!url.trim() || submitting}
              className='w-full justify-center'
            >
              {submitting ? (
                <>
                  <Spinner size='sm' aria-label='Adding job' />
                  <span>Extracting job details...</span>
                </>
              ) : (
                <>
                  <ExternalLink className='size-4' aria-hidden />
                  <span>Add job</span>
                </>
              )}
            </Button>
          </form>
        </Card>
      )}

      {error && <Alert variant='error'>{error}</Alert>}

      <div className='text-center'>
        <Button
          name='onboarding-skip-job'
          variant='ghost'
          size='sm'
          onClick={onSkip}
          disabled={submitting}
        >
          Skip for now
        </Button>
      </div>
    </div>
  );
}
