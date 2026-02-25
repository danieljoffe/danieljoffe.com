'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Alert,
  Button,
  Input,
  Spinner,
  Stack,
} from '@danieljoffe.com/shared-ui';
import { analytics } from '@/lib/analytics';
import ScanProgress from './ScanProgress';

type ScanState =
  | { phase: 'idle' }
  | { phase: 'submitting' }
  | { phase: 'polling'; scanId: string; url: string }
  | { phase: 'error'; message: string };

/** Client-safe URL validation (no node:crypto dependency). */
function isValidClientUrl(url: string): boolean {
  try {
    let normalized = url.trim();
    if (
      !normalized.startsWith('http://') &&
      !normalized.startsWith('https://')
    ) {
      normalized = `https://${normalized}`;
    }
    const parsed = new URL(normalized);
    if (!['http:', 'https:'].includes(parsed.protocol)) return false;
    if (!parsed.hostname.includes('.')) return false;
    return true;
  } catch {
    return false;
  }
}

const POLL_INTERVAL_MS = 2000;

export default function URLInputForm() {
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [validationError, setValidationError] = useState('');
  const [state, setState] = useState<ScanState>({ phase: 'idle' });
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearPoll = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  // Cleanup polling on unmount
  useEffect(() => clearPoll, [clearPoll]);

  // Start polling when entering polling phase
  useEffect(() => {
    if (state.phase !== 'polling') return;

    const { scanId } = state;

    const poll = async () => {
      try {
        const res = await fetch(`/api/audit/status/${scanId}`);
        if (!res.ok) {
          clearPoll();
          setState({ phase: 'error', message: 'Failed to check scan status.' });
          return;
        }
        const data = await res.json();
        if (data.status === 'completed') {
          clearPoll();
          router.push(`/audit/r/${scanId}`);
        } else if (data.status === 'failed') {
          clearPoll();
          setState({
            phase: 'error',
            message: data.error_message || 'Scan failed. Please try again.',
          });
        }
      } catch {
        clearPoll();
        setState({
          phase: 'error',
          message: 'Network error. Please try again.',
        });
      }
    };

    poll(); // Check immediately, then poll on interval
    pollRef.current = setInterval(poll, POLL_INTERVAL_MS);
    return clearPoll;
  }, [state, clearPoll, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    const trimmed = url.trim();
    if (!trimmed) {
      setValidationError('Please enter a URL.');
      return;
    }
    if (!isValidClientUrl(trimmed)) {
      setValidationError('Please enter a valid URL (e.g. example.com).');
      return;
    }

    setState({ phase: 'submitting' });

    try {
      const res = await fetch('/api/audit/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: trimmed, source: 'organic' }),
      });

      const data = await res.json();

      if (!res.ok) {
        const message =
          res.status === 429
            ? 'Too many scans. Please try again in an hour.'
            : data.error || 'Something went wrong. Please try again.';
        analytics.auditScanFailed(trimmed, message);
        setState({ phase: 'error', message });
        return;
      }

      analytics.auditScanStarted(trimmed);

      // Cached scan — redirect immediately
      if (data.cached) {
        router.push(`/audit/r/${data.scan_id}`);
        return;
      }

      // Start polling
      setState({ phase: 'polling', scanId: data.scan_id, url: trimmed });
    } catch {
      const message = 'Network error. Please try again.';
      analytics.auditScanFailed(trimmed, message);
      setState({ phase: 'error', message });
    }
  };

  if (state.phase === 'polling') {
    return <ScanProgress url={state.url} />;
  }

  return (
    <Stack direction='vertical' gap='sm' className='w-full max-w-md'>
      <form onSubmit={handleSubmit} noValidate>
        <Stack direction='vertical' gap='sm'>
          <Input
            type='url'
            value={url}
            onChange={e => {
              setUrl(e.target.value);
              if (validationError) setValidationError('');
            }}
            onBlur={() => {
              if (url.trim() && !isValidClientUrl(url.trim())) {
                setValidationError(
                  'Please enter a valid URL (e.g. example.com).'
                );
              }
            }}
            placeholder='https://example.com'
            aria-label='Website URL'
            error={validationError || undefined}
            disabled={state.phase === 'submitting'}
          />
          <Button
            type='submit'
            variant='primary'
            size='lg'
            disabled={state.phase === 'submitting'}
            className='w-full'
          >
            {state.phase === 'submitting' ? (
              <>
                <Spinner size='sm' variant='foreground' />
                Starting scan...
              </>
            ) : (
              'Audit this site'
            )}
          </Button>
        </Stack>
      </form>
      {state.phase === 'error' && (
        <Alert variant='error'>
          {state.message}
          <button
            onClick={() => setState({ phase: 'idle' })}
            className='block mt-2 text-sm font-medium underline hover:no-underline'
          >
            Try again
          </button>
        </Alert>
      )}
    </Stack>
  );
}
