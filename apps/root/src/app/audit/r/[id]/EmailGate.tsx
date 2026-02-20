'use client';

import { useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Input,
  Spinner,
  Stack,
} from '@danieljoffe.com/shared-ui';
import type { ScanIssue } from '@danieljoffe.com/shared-audit';
import IssueCard from './IssueCard';

interface EmailGateProps {
  gatedIssues: ScanIssue[];
  scanId: string;
}

type GateState =
  | { phase: 'locked' }
  | { phase: 'submitting' }
  | { phase: 'unlocked' }
  | { phase: 'error'; message: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function EmailGate({ gatedIssues, scanId }: EmailGateProps) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [validationError, setValidationError] = useState('');
  const [state, setState] = useState<GateState>({ phase: 'locked' });

  if (state.phase === 'unlocked') {
    return (
      <Stack direction='vertical' gap='sm'>
        {gatedIssues.map(issue => (
          <IssueCard key={issue.id} issue={issue} />
        ))}
      </Stack>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !EMAIL_RE.test(trimmedEmail)) {
      setValidationError('Please enter a valid email address.');
      return;
    }

    setState({ phase: 'submitting' });

    try {
      const res = await fetch('/api/leads/capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: trimmedEmail,
          name: name.trim() || undefined,
          scan_id: scanId,
          source: 'full_report',
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setState({
          phase: 'error',
          message: data.error || 'Something went wrong. Please try again.',
        });
        return;
      }

      // Both 'captured' and 'already_captured' unlock the gate
      setState({ phase: 'unlocked' });
    } catch {
      setState({
        phase: 'error',
        message: 'Network error. Please try again.',
      });
    }
  };

  return (
    <div className='relative'>
      {/* Blurred preview of gated issues */}
      <div
        className='select-none blur-sm pointer-events-none'
        aria-hidden='true'
      >
        <Stack direction='vertical' gap='sm'>
          {gatedIssues.slice(0, 2).map(issue => (
            <IssueCard key={issue.id} issue={issue} />
          ))}
        </Stack>
      </div>

      {/* Overlay with email form */}
      <div className='absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-xs rounded-lg'>
        <Card className='w-full max-w-sm mx-4'>
          <Stack direction='vertical' gap='sm'>
            <div className='text-center'>
              <p className='font-semibold'>
                Unlock {gatedIssues.length} more{' '}
                {gatedIssues.length === 1 ? 'fix' : 'fixes'}
              </p>
              <p className='text-sm text-foreground-muted'>
                Enter your email for the full report
              </p>
            </div>
            <form onSubmit={handleSubmit} noValidate>
              <Stack direction='vertical' gap='sm'>
                <Input
                  type='email'
                  value={email}
                  onChange={e => {
                    setEmail(e.target.value);
                    if (validationError) setValidationError('');
                  }}
                  placeholder='you@company.com'
                  aria-label='Email address'
                  error={validationError || undefined}
                  required
                  disabled={state.phase === 'submitting'}
                />
                <Input
                  type='text'
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder='Name (optional)'
                  aria-label='Name'
                  disabled={state.phase === 'submitting'}
                />
                <Button
                  type='submit'
                  variant='primary'
                  className='w-full'
                  disabled={state.phase === 'submitting'}
                >
                  {state.phase === 'submitting' ? (
                    <>
                      <Spinner size='sm' variant='foreground' />
                      Submitting...
                    </>
                  ) : (
                    'Get full report'
                  )}
                </Button>
              </Stack>
            </form>
            {state.phase === 'error' && (
              <Alert variant='error'>
                {state.message}
                <button
                  onClick={() => setState({ phase: 'locked' })}
                  className='block mt-2 text-sm font-medium underline hover:no-underline'
                >
                  Try again
                </button>
              </Alert>
            )}
          </Stack>
        </Card>
      </div>
    </div>
  );
}
