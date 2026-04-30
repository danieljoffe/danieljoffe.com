'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle } from 'lucide-react';
import { Alert } from '@danieljoffe.com/shared-ui/Alert';
import { Heading } from '@danieljoffe.com/shared-ui/Heading';
import { Section } from '@danieljoffe.com/shared-ui/Section';
import { Text } from '@danieljoffe.com/shared-ui/Text';
import Button from '@/components/Button';
import ScanProgress from '../../ScanProgress';
import { friendlyErrorMessage } from './friendlyErrorMessage';

const POLL_INTERVAL_MS = 2000;
const MAX_POLL_ATTEMPTS = 90;
const TIMEOUT_MESSAGE =
  'This scan is taking longer than expected. The worker may be unavailable. Please try again in a few minutes.';

interface ScanPendingProps {
  scanId: string;
  url: string;
  deviceMode: 'mobile' | 'desktop';
  isPaired: boolean;
}

export default function ScanPending({
  scanId,
  url,
  deviceMode,
  isPaired,
}: ScanPendingProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const attemptsRef = useRef(0);

  const clearPoll = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => {
    const poll = async () => {
      attemptsRef.current += 1;
      try {
        const res = await fetch(`/api/audit/status/${scanId}`);
        if (!res.ok) {
          clearPoll();
          setError('Failed to check scan status.');
          return;
        }
        const data = await res.json();
        if (data.status === 'completed') {
          clearPoll();
          router.refresh();
          return;
        }
        if (data.status === 'failed') {
          clearPoll();
          setError(friendlyErrorMessage(data.error_message));
          return;
        }
        if (attemptsRef.current >= MAX_POLL_ATTEMPTS) {
          clearPoll();
          setError(TIMEOUT_MESSAGE);
        }
      } catch {
        clearPoll();
        setError('Network error. Please try again.');
      }
    };

    poll();
    pollRef.current = setInterval(poll, POLL_INTERVAL_MS);
    return clearPoll;
  }, [scanId, clearPoll, router]);

  const device = isPaired ? 'both' : deviceMode;

  if (error) {
    return (
      <Section
        aria-labelledby='scan-failed-heading'
        overflow='hidden'
        center
        padding='lg'
      >
        <div className='flex flex-col gap-6 items-center text-center max-w-md mx-auto'>
          <div className='inline-flex items-center justify-center size-14 rounded-full bg-error/10'>
            <AlertTriangle className='size-7 text-error' aria-hidden='true' />
          </div>

          <div>
            <Heading variant='section' id='scan-failed-heading'>
              Scan failed
            </Heading>
            <Text variant='bodyLg' className='mt-2 truncate max-w-sm mx-auto'>
              {url}
            </Text>
          </div>

          <Alert variant='error'>{error}</Alert>

          <Button as='link' href='/audit'>
            Try again
          </Button>
        </div>
      </Section>
    );
  }

  return (
    <Section overflow='hidden' center padding='lg'>
      <div className='flex flex-col gap-6 items-center max-w-md mx-auto'>
        <ScanProgress url={url} device={device} />
      </div>
    </Section>
  );
}
