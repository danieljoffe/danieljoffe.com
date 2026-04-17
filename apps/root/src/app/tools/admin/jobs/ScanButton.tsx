'use client';

import { useState } from 'react';
import { Spinner } from '@danieljoffe.com/shared-ui/Spinner';
import { Text } from '@danieljoffe.com/shared-ui/Text';
import Button from '@/components/Button';
import { useToast } from '@/state/Toast/ToastProvider';

interface ScanButtonProps {
  onComplete: () => void;
}

interface PollResult {
  sources_polled: number;
  new_jobs: number;
  updated_jobs: number;
  archived_jobs: number;
  errors: string[];
}

export default function ScanButton({ onComplete }: ScanButtonProps) {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<PollResult | null>(null);
  const { toast } = useToast();

  async function handleScan() {
    setScanning(true);
    setResult(null);
    try {
      const res = await fetch('/api/jobs/poll', { method: 'POST' });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast({
          variant: 'error',
          title: 'Scan failed',
          description:
            data?.error ?? `Request failed with status ${res.status}`,
        });
        return;
      }
      setResult(data);
      onComplete();
      if (data?.errors?.length) {
        toast({
          variant: 'warning',
          title: 'Scan completed with errors',
          description: `${data.errors.length} source(s) failed — check logs`,
        });
      }
    } catch (err) {
      toast({
        variant: 'error',
        title: 'Scan failed',
        description: err instanceof Error ? err.message : 'Network error',
      });
    } finally {
      setScanning(false);
    }
  }

  return (
    <div className='flex items-center gap-3'>
      {result && (
        <Text variant='meta'>
          {result.sources_polled} sources, {result.new_jobs} new,{' '}
          {result.updated_jobs} updated
          {result.archived_jobs > 0 && `, ${result.archived_jobs} archived`}
          {result.errors.length > 0 && `, ${result.errors.length} errors`}
        </Text>
      )}
      <Button
        name='scan-now'
        variant='primary'
        size='sm'
        onClick={handleScan}
        disabled={scanning}
      >
        {scanning ? (
          <>
            <Spinner
              size='sm'
              aria-hidden='true'
              className='border-current/30 border-t-current'
            />
            Scanning...
          </>
        ) : (
          'Scan now'
        )}
      </Button>
    </div>
  );
}
