'use client';

import { useEffect, useState } from 'react';
import { Alert } from '@danieljoffe.com/shared-ui/Alert';
import { Card } from '@danieljoffe.com/shared-ui/Card';
import { Heading } from '@danieljoffe.com/shared-ui/Heading';
import { Input } from '@danieljoffe.com/shared-ui/Input';
import { Text } from '@danieljoffe.com/shared-ui/Text';
import Button from '@/components/Button';
import { extractApiError } from '@/lib/extractApiError';

interface IdentityStepProps {
  onComplete: () => void;
  onSkip: () => void;
}

interface IdentityFields {
  name?: string | null;
  email?: string | null;
}

/**
 * Capture the user's contact name (and confirm email) before any
 * LLM-backed flow runs. Without this, first-time users hit the
 * backend's "No contact name on file" 400 the moment they click
 * Generate Resume / Cover Letter and have to deal with the
 * mid-flow ``window.prompt`` from PR #683 — a usable fallback but
 * a worse first impression.
 *
 * Pre-fills both fields from ``/api/profile/identity`` (the auth
 * cookie pre-seeds email on the wyrdfold-api side for new accounts).
 * Name is the only required field — everything else (phone,
 * location, links) lives in Settings for users who want them on
 * their resume header.
 */
export default function IdentityStep({
  onComplete,
  onSkip,
}: IdentityStepProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch('/api/profile/identity');
        if (!res.ok) return;
        const data = (await res.json()) as IdentityFields;
        if (cancelled) return;
        if (data.name) setName(data.name);
        if (data.email) setEmail(data.email);
      } catch {
        // Non-critical — the user will fill in fields manually
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || saving) return;
    setError(null);
    setSaving(true);
    try {
      const res = await fetch('/api/profile/identity', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          ...(email.trim() ? { email: email.trim() } : {}),
        }),
      });
      if (!res.ok) {
        setError(await extractApiError(res, 'Could not save your details'));
        return;
      }
      onComplete();
    } catch {
      setError('Network error saving your details. Try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card padding='lg' className='w-full'>
      <form onSubmit={handleSave} className='flex flex-col gap-5'>
        <div>
          <Heading variant='component' as='h2'>
            What goes on your resume?
          </Heading>
          <Text variant='caption' className='mt-1 text-text-secondary'>
            We use these on the contact header of every tailored resume and
            cover letter. You can update them later in Settings.
          </Text>
        </div>

        <Input
          label='Name'
          required
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder='Daniel Joffe'
          autoComplete='name'
          autoFocus
          disabled={loading || saving}
          data-sentry-mask
        />
        <Input
          label='Email'
          type='email'
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder='you@example.com'
          autoComplete='email'
          helperText='Pre-filled from your sign-in.'
          disabled={loading || saving}
          data-sentry-mask
        />

        {error && <Alert variant='error'>{error}</Alert>}

        <div className='flex items-center justify-between'>
          <Button
            name='onboarding-identity-skip'
            variant='ghost'
            size='sm'
            type='button'
            onClick={onSkip}
            disabled={saving}
          >
            Skip for now
          </Button>
          <Button
            name='onboarding-identity-save'
            variant='primary'
            size='sm'
            type='submit'
            disabled={!name.trim() || loading || saving}
          >
            {saving ? 'Saving...' : 'Continue'}
          </Button>
        </div>
      </form>
    </Card>
  );
}
