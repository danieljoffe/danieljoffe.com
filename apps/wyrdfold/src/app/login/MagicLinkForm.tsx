'use client';

import { useState } from 'react';
import { Heading } from '@danieljoffe.com/shared-ui/Heading';
import { PageLayout } from '@danieljoffe.com/shared-ui/PageLayout';
import { Section } from '@danieljoffe.com/shared-ui/Section';
import { Text } from '@danieljoffe.com/shared-ui/Text';
import {
  BASE_FIELD,
  FIELD_PADDING,
  FIELD_PLACEHOLDER,
} from '@danieljoffe.com/shared-ui/styles/formStyles';
import { cn } from '@/lib/cn';
import Button from '@/components/Button';
import { createAuthBrowserClient } from '@/lib/supabase/auth-client';

type FormState = 'idle' | 'loading' | 'sent' | 'error';

interface MagicLinkFormProps {
  next: string | undefined;
}

const NEXT_COOKIE = 'wyrdfold_login_next';
const NEXT_COOKIE_MAX_AGE_S = 600;

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

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
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
    }
  }

  if (formState === 'sent') {
    return (
      <PageLayout>
        <Section padding='none' center className='gap-4'>
          <div className='text-center space-y-2'>
            <Heading variant='hero' as='h1'>
              Check your email
            </Heading>
            <Text variant='body'>
              A magic link has been sent to{' '}
              <span className='font-medium text-text-primary'>{email}</span>.
              Click the link in the email to sign in.
            </Text>
          </div>

          <div className='max-w-sm mx-auto'>
            <Button
              name='wyrdfold-back-to-login'
              variant='secondary'
              className='w-full'
              onClick={() => {
                setFormState('idle');
                setEmail('');
              }}
            >
              Use a different email
            </Button>
          </div>
        </Section>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <Section
        background='elevated'
        padding='lg'
        center
        className='rounded-lg border border-border gap-4'
      >
        <div className='text-center space-y-2'>
          <Heading variant='hero' as='h1'>
            Sign in to WyrdFold
          </Heading>
          <Text variant='body'>Enter your email to receive a magic link.</Text>
        </div>

        <form onSubmit={handleSubmit}>
          <div className='flex flex-col gap-4'>
            <input
              type='email'
              placeholder='you@example.com'
              value={email}
              onChange={e => setEmail(e.target.value)}
              aria-label='Email address'
              aria-describedby={
                formState === 'error' ? 'login-error' : undefined
              }
              autoFocus
              required
              data-sentry-mask
              className={cn(BASE_FIELD, FIELD_PADDING, FIELD_PLACEHOLDER)}
            />
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
              disabled={formState === 'loading' || !email}
            >
              {formState === 'loading' ? 'Sending...' : 'Send magic link'}
            </Button>
          </div>
        </form>
      </Section>
    </PageLayout>
  );
}
