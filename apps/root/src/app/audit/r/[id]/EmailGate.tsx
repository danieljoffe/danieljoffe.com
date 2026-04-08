'use client';

import { useState } from 'react';
import type { ScanIssue } from '@danieljoffe.com/shared-audit';
import { Alert } from '@danieljoffe.com/shared-ui/Alert';
import { Spinner } from '@danieljoffe.com/shared-ui/Spinner';
import { Text } from '@danieljoffe.com/shared-ui/Text';
import { FormFieldError } from '@danieljoffe.com/shared-ui/FormFieldError';
import {
  BASE_FIELD,
  DISABLED,
  FIELD_ERROR,
  FIELD_PADDING,
  FIELD_PLACEHOLDER,
} from '@danieljoffe.com/shared-ui/styles/formStyles';
import { analytics } from '@/lib/analytics';
import { useToast } from '@/state/Toast/ToastProvider';
import { VALIDATION_PATTERNS } from '@/utils/constants';
import { cn } from '@/lib/cn';
import Button from '@/components/Button';
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

export default function EmailGate({ gatedIssues, scanId }: EmailGateProps) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [validationError, setValidationError] = useState('');
  const [state, setState] = useState<GateState>({ phase: 'locked' });
  const { toast } = useToast();

  if (state.phase === 'unlocked') {
    return (
      <div className='flex flex-col gap-2'>
        {gatedIssues.map(issue => (
          <IssueCard key={issue.id} issue={issue} />
        ))}
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !VALIDATION_PATTERNS.EMAIL.test(trimmedEmail)) {
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
        toast({
          variant: 'error',
          title: 'Something went wrong',
          description: data.error || 'Please try again.',
        });
        return;
      }

      // Both 'captured' and 'already_captured' unlock the gate
      analytics.auditEmailCaptured(scanId);
      toast({ variant: 'success', title: 'Full report unlocked!' });
      setState({ phase: 'unlocked' });
    } catch {
      setState({
        phase: 'error',
        message: 'Network error. Please try again.',
      });
      toast({
        variant: 'error',
        title: 'Network error',
        description: 'Please check your connection and try again.',
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
        <div className='flex flex-col gap-2'>
          {gatedIssues.slice(0, 2).map(issue => (
            <IssueCard key={issue.id} issue={issue} />
          ))}
        </div>
      </div>

      {/* Overlay with email form */}
      <div className='absolute inset-0 flex items-center justify-center bg-surface/80 backdrop-blur-xs rounded-lg'>
        <div className='rounded-lg border border-border bg-surface-elevated p-6 w-full max-w-sm mx-4'>
          <div className='flex flex-col gap-2'>
            <div className='text-center'>
              <p className='font-semibold'>
                Unlock {gatedIssues.length} more{' '}
                {gatedIssues.length === 1 ? 'fix' : 'fixes'}
              </p>
              <Text variant='body'>Enter your email for the full report</Text>
            </div>
            <form onSubmit={handleSubmit} noValidate>
              <div className='flex flex-col gap-2'>
                <div className='w-full'>
                  <input
                    type='email'
                    value={email}
                    onChange={e => {
                      setEmail(e.target.value);
                      if (validationError) setValidationError('');
                    }}
                    placeholder='you@company.com'
                    aria-label='Email address'
                    aria-describedby={
                      validationError ? 'email-error' : undefined
                    }
                    required
                    disabled={state.phase === 'submitting'}
                    data-sentry-mask
                    className={cn(
                      BASE_FIELD,
                      FIELD_PADDING,
                      FIELD_PLACEHOLDER,
                      DISABLED,
                      validationError && FIELD_ERROR
                    )}
                  />
                  <FormFieldError message={validationError} id='email-error' />
                </div>
                <input
                  type='text'
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder='Name (optional)'
                  aria-label='Name'
                  disabled={state.phase === 'submitting'}
                  data-sentry-mask
                  className={cn(
                    BASE_FIELD,
                    FIELD_PADDING,
                    FIELD_PLACEHOLDER,
                    DISABLED
                  )}
                />
                <Button
                  type='submit'
                  name='email-gate-submit'
                  disabled={state.phase === 'submitting'}
                  className='w-full'
                >
                  {state.phase === 'submitting' ? (
                    <>
                      <Spinner size='sm' aria-label='Submitting' />
                      Submitting...
                    </>
                  ) : (
                    'Get full report'
                  )}
                </Button>
              </div>
            </form>
            {state.phase === 'error' && (
              <Alert variant='error'>
                {state.message}
                <Button
                  type='button'
                  name='retry-email-gate'
                  variant='bare'
                  size='sm'
                  onClick={() => setState({ phase: 'locked' })}
                  className='block mt-2 text-sm font-medium underline hover:no-underline'
                >
                  Try again
                </Button>
              </Alert>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
