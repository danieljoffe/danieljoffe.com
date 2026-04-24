'use client';

import { useState, type FormEvent } from 'react';
import { Heading } from '@danieljoffe.com/shared-ui/Heading';
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

export default function MagicLinkForm() {
  const [email, setEmail] = useState('');
  const [formState, setFormState] = useState<FormState>('idle');
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormState('loading');
    setError('');

    const supabase = createAuthBrowserClient();
    const { error: authError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/fitted/auth/callback`,
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
      <div className='flex flex-col items-center justify-center min-h-[60vh]'>
        <div className='rounded-lg border border-border bg-surface-elevated w-full max-w-sm'>
          <div className='p-6'>
            <div className='flex flex-col gap-4'>
              <Heading variant='component' as='h2' className='text-center'>
                Check your email
              </Heading>
              <Text variant='body' className='text-center'>
                A magic link has been sent to{' '}
                <span className='font-medium text-fg'>{email}</span>. Click the
                link in the email to sign in.
              </Text>
              <Button
                name='fitted-back-to-login'
                variant='secondary'
                onClick={() => {
                  setFormState('idle');
                  setEmail('');
                }}
              >
                Use a different email
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='flex flex-col items-center justify-center min-h-[60vh]'>
      <div className='rounded-lg border border-border bg-surface-elevated w-full max-w-sm'>
        <div className='p-6'>
          <form onSubmit={handleSubmit}>
            <div className='flex flex-col gap-4'>
              <Heading variant='component' as='h2' className='text-center'>
                Sign in to Fitted
              </Heading>
              <Text variant='body' className='text-center'>
                Enter your email to receive a magic link.
              </Text>
              <input
                type='email'
                placeholder='you@example.com'
                value={email}
                onChange={e => setEmail(e.target.value)}
                aria-label='Email address'
                autoFocus
                required
                data-sentry-mask
                className={cn(BASE_FIELD, FIELD_PADDING, FIELD_PLACEHOLDER)}
              />
              {formState === 'error' && (
                <Text variant='error' className='text-center' role='alert'>
                  {error}
                </Text>
              )}
              <Button
                type='submit'
                name='fitted-sign-in'
                disabled={formState === 'loading' || !email}
              >
                {formState === 'loading' ? 'Sending...' : 'Send magic link'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
