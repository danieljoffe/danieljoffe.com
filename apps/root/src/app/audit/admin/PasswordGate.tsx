'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  Button,
  Card,
  CardContent,
  Input,
  Stack,
} from '@danieljoffe.com/shared-ui';

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
    <Stack
      direction='vertical'
      align='center'
      justify='center'
      className='min-h-[60vh]'
    >
      <Card className='w-full max-w-sm'>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <Stack direction='vertical' gap='md'>
              <h2 className='text-xl font-semibold text-center'>
                Admin Dashboard
              </h2>
              <p className='text-foreground-muted text-center text-sm'>
                Enter the admin password to continue.
              </p>
              <Input
                type='password'
                placeholder='Password'
                value={password}
                onChange={e => setPassword(e.target.value)}
                aria-label='Admin password'
                autoFocus
                disabled={isLockedOut}
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
              <Button
                type='submit'
                variant='primary'
                disabled={loading || !password || isLockedOut}
              >
                {loading ? 'Verifying...' : 'Sign in'}
              </Button>
            </Stack>
          </form>
        </CardContent>
      </Card>
    </Stack>
  );
}
