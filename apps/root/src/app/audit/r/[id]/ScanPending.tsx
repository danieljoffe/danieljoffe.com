'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import {
  Alert,
  PageContainer,
  Section,
  Stack,
} from '@danieljoffe.com/shared-ui';
import ScanProgress from '../../ScanProgress';
import { friendlyErrorMessage } from './friendlyErrorMessage';

const POLL_INTERVAL_MS = 2000;

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

  const clearPoll = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => {
    const poll = async () => {
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
        } else if (data.status === 'failed') {
          clearPoll();
          setError(friendlyErrorMessage(data.error_message));
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
        className='min-h-min max-h-max'
        aria-labelledby='scan-failed-heading'
        background='alt'
      >
        <PageContainer className='py-20 md:py-32'>
          <Stack
            direction='vertical'
            align='center'
            gap='lg'
            className='text-center max-w-md mx-auto'
          >
            <div className='inline-flex items-center justify-center size-14 rounded-full bg-error/10'>
              <AlertTriangle className='size-7 text-error' aria-hidden='true' />
            </div>

            <div>
              <h1
                id='scan-failed-heading'
                className='font-sans text-2xl md:text-3xl font-semibold tracking-tight'
              >
                Scan failed
              </h1>
              <p className='text-text-secondary mt-2 truncate max-w-sm mx-auto'>
                {url}
              </p>
            </div>

            <Alert variant='error'>{error}</Alert>

            <Link
              href='/audit'
              className='inline-flex items-center justify-center rounded-md bg-brand-500 px-6 py-3 text-text-inverse hover:bg-brand-600 transition'
            >
              Try again
            </Link>
          </Stack>
        </PageContainer>
      </Section>
    );
  }

  return (
    <Section className='min-h-min max-h-max' background='alt'>
      <PageContainer className='py-20 md:py-32'>
        <Stack
          direction='vertical'
          align='center'
          gap='lg'
          className='max-w-md mx-auto'
        >
          <ScanProgress url={url} device={device} />
        </Stack>
      </PageContainer>
    </Section>
  );
}
