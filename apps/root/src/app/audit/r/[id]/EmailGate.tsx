'use client';

import { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import type { ScanIssue } from '@danieljoffe.com/shared-audit';
import { analytics } from '@/lib/analytics';
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
      analytics.auditEmailCaptured(scanId);
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
              <p className='text-sm text-text-secondary'>
                Enter your email for the full report
              </p>
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
                    required
                    disabled={state.phase === 'submitting'}
                    className={`w-full px-4 py-2.5 bg-surface border rounded-md text-text-primary placeholder:text-text-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:border-transparent transition-all ${
                      validationError
                        ? 'border-error focus-visible:ring-error'
                        : 'border-border focus-visible:ring-brand-500'
                    }`}
                  />
                  {validationError && (
                    <p className='mt-1.5 text-sm text-error'>
                      {validationError}
                    </p>
                  )}
                </div>
                <input
                  type='text'
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder='Name (optional)'
                  aria-label='Name'
                  disabled={state.phase === 'submitting'}
                  className='w-full px-4 py-2.5 bg-surface border border-border rounded-md text-text-primary placeholder:text-text-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:border-transparent transition-all'
                />
                <button
                  type='submit'
                  disabled={state.phase === 'submitting'}
                  className='inline-flex items-center justify-center gap-2 rounded-md transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:opacity-50 disabled:cursor-not-allowed hover:cursor-pointer bg-brand-500 text-white hover:bg-brand-600 active:bg-brand-700 px-4 py-3 w-full'
                >
                  {state.phase === 'submitting' ? (
                    <>
                      <span
                        role='status'
                        className='inline-block size-4 border-2 rounded-full animate-spin border-foreground-subtle/30 border-t-foreground'
                      >
                        <span className='sr-only'>Loading...</span>
                      </span>
                      Submitting...
                    </>
                  ) : (
                    'Get full report'
                  )}
                </button>
              </div>
            </form>
            {state.phase === 'error' && (
              <div
                role='alert'
                className='relative rounded-lg border p-4 bg-error-light border-error/30 text-error'
              >
                <div className='flex gap-3'>
                  <AlertCircle className='size-5 shrink-0 mt-0.5' />
                  <div className='flex-1 text-sm text-text-secondary'>
                    {state.message}
                    <button
                      onClick={() => setState({ phase: 'locked' })}
                      className='block mt-2 text-sm font-medium underline hover:no-underline'
                    >
                      Try again
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
