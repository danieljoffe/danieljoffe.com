'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';

interface PasswordGateProps {
  onAuthenticated: (password: string) => void;
}

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function PasswordGate({ onAuthenticated }: PasswordGateProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isLockedOut = lockoutSeconds > 0;

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  function startCountdown(seconds: number) {
    setLockoutSeconds(seconds);

    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      setLockoutSeconds(prev => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          timerRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/audit/admin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        onAuthenticated(password);
      } else if (res.status === 429) {
        const data = await res.json();
        startCountdown(data.retryAfter ?? 60);
        setError('');
      } else {
        const data = await res.json();
        setError(data.error ?? 'Invalid password');
      }
    } catch {
      setError('Failed to verify password');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className='flex flex-col items-center justify-center min-h-[60vh]'>
      <div className='rounded-lg border border-border bg-surface-elevated w-full max-w-sm'>
        <div className='p-6'>
          <form onSubmit={handleSubmit}>
            <div className='flex flex-col gap-4'>
              <h2 className='text-xl font-semibold text-center'>
                Admin Dashboard
              </h2>
              <p className='text-text-secondary text-center text-sm'>
                Enter the admin password to continue.
              </p>
              <input
                type='password'
                placeholder='Password'
                value={password}
                onChange={e => setPassword(e.target.value)}
                aria-label='Admin password'
                autoFocus
                disabled={isLockedOut}
                className='w-full px-4 py-2.5 bg-surface border border-border rounded-md text-text-primary placeholder:text-text-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:border-transparent transition-all'
              />
              {isLockedOut && (
                <p className='text-error text-sm text-center' role='alert'>
                  Too many attempts. Try again in{' '}
                  {formatCountdown(lockoutSeconds)}.
                </p>
              )}
              {error && !isLockedOut && (
                <p className='text-error text-sm text-center' role='alert'>
                  {error}
                </p>
              )}
              <button
                type='submit'
                disabled={loading || !password || isLockedOut}
                className='inline-flex items-center justify-center gap-2 rounded-md transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:opacity-50 disabled:cursor-not-allowed hover:cursor-pointer bg-brand-500 text-white hover:bg-brand-600 active:bg-brand-700 px-4 py-3'
              >
                {loading ? 'Verifying...' : 'Sign in'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
