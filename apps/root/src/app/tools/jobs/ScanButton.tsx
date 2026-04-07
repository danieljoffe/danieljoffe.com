'use client';

import { useState } from 'react';
import { Spinner } from '@danieljoffe.com/shared-ui/Spinner';
import { Text } from '@danieljoffe.com/shared-ui/Text';
import Button from '@/components/Button';

interface ScanButtonProps {
  password: string;
  onComplete: () => void;
}

interface PollResult {
  sources_polled: number;
  new_jobs: number;
  updated_jobs: number;
  errors: string[];
}

export default function ScanButton({ password, onComplete }: ScanButtonProps) {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<PollResult | null>(null);

  async function handleScan() {
    setScanning(true);
    setResult(null);
    try {
      const res = await fetch('/api/jobs/poll', {
        method: 'POST',
        headers: { 'x-admin-password': password },
      });
      if (res.ok) {
        const data = await res.json();
        setResult(data);
        onComplete();
      }
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
