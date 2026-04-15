'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Heading } from '@danieljoffe.com/shared-ui/Heading';
import { Text } from '@danieljoffe.com/shared-ui/Text';
import {
  BASE_FIELD,
  FIELD_PADDING,
  FIELD_PLACEHOLDER,
} from '@danieljoffe.com/shared-ui/styles/formStyles';
import { cn } from '@/lib/cn';
import Button from '@/components/Button';

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function sanitizeNext(next: string | null): string {
  if (!next) return '/tools/admin';
  if (!next.startsWith('/')) return '/tools/admin';
  if (next.startsWith('//')) return '/tools/admin';
  return next;
}

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = sanitizeNext(searchParams.get('next'));

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
      const res = await fetch('/api/tools/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        router.replace(next);
        router.refresh();
      } else if (res.status === 429) {
        const data = await res.json();
        startCountdown(data.retryAfterSeconds ?? 60);
        setError('');
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? 'Invalid password');
      }
    } catch {
      setError('Failed to sign in');
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
              <Heading variant='component' as='h2' className='text-center'>
                Tools Admin
              </Heading>
              <Text variant='body' className='text-center'>
                Enter the admin password to continue.
              </Text>
              <input
                type='password'
                placeholder='Password'
                value={password}
                onChange={e => setPassword(e.target.value)}
                aria-label='Admin password'
                autoFocus
                disabled={isLockedOut}
                data-sentry-mask
                className={cn(BASE_FIELD, FIELD_PADDING, FIELD_PLACEHOLDER)}
              />
              {isLockedOut && (
                <Text variant='error' className='text-center' role='alert'>
                  Too many attempts. Try again in{' '}
                  {formatCountdown(lockoutSeconds)}.
                </Text>
              )}
              {error && !isLockedOut && (
                <Text variant='error' className='text-center' role='alert'>
                  {error}
                </Text>
              )}
              <Button
                type='submit'
                name='tools-sign-in'
                disabled={loading || !password || isLockedOut}
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
