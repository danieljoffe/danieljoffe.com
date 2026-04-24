'use client';

import { useCallback, useEffect, useState } from 'react';
import { Heading } from '@danieljoffe.com/shared-ui/Heading';
import { Spinner } from '@danieljoffe.com/shared-ui/Spinner';
import { Text } from '@danieljoffe.com/shared-ui/Text';
import {
  BASE_FIELD,
  FIELD_PADDING,
  FIELD_PLACEHOLDER,
} from '@danieljoffe.com/shared-ui/styles/formStyles';
import Button from '@/components/Button';
import { cn } from '@/lib/cn';
import { useToast } from '@/state/Toast/ToastProvider';

const inputStyles = cn(BASE_FIELD, FIELD_PADDING, FIELD_PLACEHOLDER);

interface Preferences {
  id: string;
  email: string;
  jobScoreThreshold: number;
  jobNotificationsEnabled: boolean;
  unsubscribedAt: string | null;
  updatedAt: string;
}

export default function NotificationPreferencesPanel() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [email, setEmail] = useState('');
  const [threshold, setThreshold] = useState(70);
  const [enabled, setEnabled] = useState(true);
  const [unsubscribedAt, setUnsubscribedAt] = useState<string | null>(null);

  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/jobs/notifications/preferences');
      if (!res.ok) {
        toast({ variant: 'error', title: 'Failed to load preferences' });
        return;
      }
      const data = await res.json();
      const prefs = data.preferences as Preferences | null;
      if (prefs) {
        setEmail(prefs.email);
        setThreshold(prefs.jobScoreThreshold);
        setEnabled(prefs.jobNotificationsEnabled);
        setUnsubscribedAt(prefs.unsubscribedAt);
      }
    } catch {
      toast({ variant: 'error', title: 'Failed to load preferences' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSave() {
    if (!email.includes('@')) {
      toast({ variant: 'error', title: 'Enter a valid email' });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/jobs/notifications/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          jobScoreThreshold: threshold,
          jobNotificationsEnabled: enabled,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast({
          variant: 'error',
          title: 'Save failed',
          description:
            data?.error ?? `Request failed with status ${res.status}`,
        });
        return;
      }
      const prefs = data.preferences as Preferences;
      setUnsubscribedAt(prefs.unsubscribedAt);
      toast({ variant: 'success', title: 'Preferences saved' });
    } catch (err) {
      toast({
        variant: 'error',
        title: 'Save failed',
        description: err instanceof Error ? err.message : 'Network error',
      });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className='flex justify-center py-12'>
        <Spinner aria-label='Loading preferences' />
      </div>
    );
  }

  return (
    <div className='space-y-6 max-w-xl'>
      <Heading variant='section' as='h2'>
        Job Alert Email Notifications
      </Heading>

      <Text variant='body' className='text-text-secondary'>
        Send an email when a new job posting scores at or above the threshold.
        Deduplicated — each posting only fires one alert.
      </Text>

      <div className='space-y-4'>
        <div className='flex flex-col gap-1'>
          <label htmlFor='notify-email' className='text-sm text-text-secondary'>
            Email address
          </label>
          <input
            id='notify-email'
            type='email'
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder='you@example.com'
            className={inputStyles}
          />
        </div>

        <div className='flex flex-col gap-1'>
          <label
            htmlFor='notify-threshold'
            className='text-sm text-text-secondary'
          >
            Score threshold: <span className='font-mono'>{threshold}</span>
          </label>
          <input
            id='notify-threshold'
            type='range'
            min={0}
            max={100}
            step={1}
            value={threshold}
            onChange={e => setThreshold(Number(e.target.value))}
            className='w-full'
          />
          <Text variant='body' className='text-xs text-text-tertiary'>
            Jobs scoring at or above this value trigger an email.
          </Text>
        </div>

        <div className='flex items-center gap-3'>
          <input
            id='notify-enabled'
            type='checkbox'
            checked={enabled}
            onChange={e => setEnabled(e.target.checked)}
          />
          <label htmlFor='notify-enabled' className='text-sm'>
            Notifications enabled
          </label>
        </div>

        {unsubscribedAt && (
          <Text variant='body' className='text-xs text-warning'>
            Unsubscribed via email link on{' '}
            {new Date(unsubscribedAt).toLocaleString()}. Enabling here will
            resubscribe.
          </Text>
        )}

        <Button
          name='save-notification-prefs'
          variant='primary'
          size='md'
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Saving…' : 'Save preferences'}
        </Button>
      </div>
    </div>
  );
}
