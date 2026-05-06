'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Mail, CheckCircle2 } from 'lucide-react';
import { Heading } from '@danieljoffe.com/shared-ui/Heading';
import { Text } from '@danieljoffe.com/shared-ui/Text';
import {
  BASE_FIELD,
  FIELD_PADDING,
  FIELD_PLACEHOLDER,
} from '@danieljoffe.com/shared-ui/styles/formStyles';
import { cn } from '@/lib/cn';
import Button from '@/components/Button';
import WyrdfoldLogo from '@/components/WyrdfoldLogo';
import { createAuthBrowserClient } from '@/lib/supabase/auth-client';

type FormState = 'idle' | 'loading' | 'sent' | 'error';

interface MagicLinkFormProps {
  next: string | undefined;
}

const NEXT_COOKIE = 'wyrdfold_login_next';
const NEXT_COOKIE_MAX_AGE_S = 600;
const RESEND_COOLDOWN_S = 30;

/**
 * Stash `next` in a short-lived cookie instead of appending it to
 * `emailRedirectTo`. Adding a query string to the redirect URL forces
 * Supabase to treat it as a different URL and — depending on the
 * project's Redirect URL allowlist — silently fall back to the Site URL
 * (production), dropping `next` and breaking dev login. The cookie sits
 * alongside the request, the callback reads it after exchanging the
 * code, then clears it.
 */
function stashNextInCookie(next: string): void {
  document.cookie = `${NEXT_COOKIE}=${encodeURIComponent(next)}; max-age=${NEXT_COOKIE_MAX_AGE_S}; path=/; samesite=lax`;
}

export default function MagicLinkForm({ next }: MagicLinkFormProps) {
  const [email, setEmail] = useState('');
  const [formState, setFormState] = useState<FormState>('idle');
  const [error, setError] = useState('');
  const [resendIn, setResendIn] = useState(0);

  // Resend cooldown — counts down from RESEND_COOLDOWN_S after the link is sent.
  useEffect(() => {
    if (formState !== 'sent' || resendIn === 0) return;
    const t = setTimeout(() => setResendIn(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [formState, resendIn]);

  async function sendLink(e?: React.SyntheticEvent<HTMLFormElement>) {
    e?.preventDefault();
    setFormState('loading');
    setError('');

    if (next) {
      stashNextInCookie(next);
    }

    const supabase = createAuthBrowserClient();
    const { error: authError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (authError) {
      setError(authError.message);
      setFormState('error');
    } else {
      setFormState('sent');
      setResendIn(RESEND_COOLDOWN_S);
    }
  }

  return (
    <main className='min-h-screen flex flex-col items-center justify-center px-6 py-12'>
      <div className='w-full max-w-xs flex flex-col items-center gap-6'>
        <Link
          href='/'
          aria-label='WyrdFold home'
          className='rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface'
        >
          <WyrdfoldLogo aria-hidden className='h-12 w-16 select-none' />
        </Link>

        {formState === 'sent' ? (
          <>
            <div className='flex flex-col items-center gap-2 text-center'>
              <CheckCircle2 className='h-10 w-10 text-brand-500' aria-hidden />
              <Heading variant='hero' as='h1'>
                Check your email
              </Heading>
              <Text variant='body' className='text-text-secondary'>
                Magic link sent to{' '}
                <span className='font-medium text-text-primary'>{email}</span>.
              </Text>
            </div>

            <div className='w-full flex flex-col gap-2'>
              <Button
                name='wyrdfold-resend'
                variant='primary'
                className='w-full'
                disabled={resendIn > 0}
                onClick={() => sendLink()}
              >
                {resendIn > 0 ? `Resend in ${resendIn}s` : 'Resend link'}
              </Button>
              <Button
                name='wyrdfold-back-to-login'
                variant='ghost'
                size='sm'
                className='w-full'
                onClick={() => {
                  setFormState('idle');
                  setEmail('');
                  setResendIn(0);
                }}
              >
                Use a different email
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className='flex flex-col items-center gap-1 text-center'>
              <Heading variant='hero' as='h1'>
                Sign in
              </Heading>
              <Text variant='body' className='text-text-secondary'>
                Two clicks: enter your email, click the link in your inbox.
              </Text>
            </div>

            <form onSubmit={sendLink} className='w-full flex flex-col gap-3'>
              <div className='relative'>
                <Mail
                  className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary pointer-events-none'
                  aria-hidden
                />
                <input
                  type='email'
                  placeholder='you@example.com'
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  aria-label='Email address'
                  aria-describedby={
                    formState === 'error' ? 'login-error' : undefined
                  }
                  required
                  data-sentry-mask
                  className={cn(
                    BASE_FIELD,
                    FIELD_PADDING,
                    FIELD_PLACEHOLDER,
                    'pl-9'
                  )}
                />
              </div>
              {formState === 'error' && (
                <Text
                  variant='error'
                  className='text-center'
                  role='alert'
                  id='login-error'
                >
                  {error}
                </Text>
              )}
              <Button
                type='submit'
                name='wyrdfold-sign-in'
                className='w-full'
                disabled={formState === 'loading' || !email}
              >
                {formState === 'loading' ? 'Sending…' : 'Send magic link'}
              </Button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
