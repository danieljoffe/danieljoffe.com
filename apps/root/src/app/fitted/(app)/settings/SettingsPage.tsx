'use client';

import { useCallback, useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@danieljoffe.com/shared-ui/Card';
import { Heading } from '@danieljoffe.com/shared-ui/Heading';
import { Input } from '@danieljoffe.com/shared-ui/Input';
import { Skeleton } from '@danieljoffe.com/shared-ui/Skeleton';
import { Spinner } from '@danieljoffe.com/shared-ui/Spinner';
import { Switch } from '@danieljoffe.com/shared-ui/Switch';
import { Text } from '@danieljoffe.com/shared-ui/Text';
import Button from '@/components/Button';
import { useToast } from '@/state/Toast/ToastProvider';

async function extractFastApiError(res: Response): Promise<string | null> {
  if (res.ok) return null;
  try {
    const body = (await res.clone().json()) as { detail?: unknown };
    if (Array.isArray(body.detail)) {
      const first = body.detail[0] as { msg?: string } | undefined;
      if (first?.msg) return first.msg.replace(/^Value error,\s*/, '');
    } else if (typeof body.detail === 'string') {
      return body.detail;
    }
  } catch {
    // not JSON / no body — fall through
  }
  return null;
}

interface NotificationPreferences {
  job_notifications_enabled: boolean;
  job_score_threshold: number;
  sms_notifications_enabled: boolean;
  sms_score_threshold: number;
  sms_daily_limit: number;
  phone_number: string | null;
  email: string | null;
  email_available: boolean;
  sms_available: boolean;
}

interface IdentityFields {
  name: string | null;
  email: string | null;
  phone_number: string | null;
  location: string | null;
  linkedin_url: string | null;
  website_url: string | null;
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  const { toast } = useToast();

  // Form state
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [emailThreshold, setEmailThreshold] = useState('100');
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [smsThreshold, setSmsThreshold] = useState('100');
  const [smsDailyLimit, setSmsDailyLimit] = useState('5');
  const [phoneNumber, setPhoneNumber] = useState('');

  // Profile identity (F3-A): contact info used for resume + cover-letter headers.
  const [identity, setIdentity] = useState<IdentityFields | null>(null);
  const [identityName, setIdentityName] = useState('');
  const [identityEmail, setIdentityEmail] = useState('');
  const [identityPhone, setIdentityPhone] = useState('');
  const [identityLocation, setIdentityLocation] = useState('');
  const [identityLinkedin, setIdentityLinkedin] = useState('');
  const [identityWebsite, setIdentityWebsite] = useState('');

  const fetchPrefs = useCallback(async () => {
    try {
      const [prefsRes, identityRes] = await Promise.all([
        fetch('/api/profile/notifications'),
        fetch('/api/profile/identity'),
      ]);
      if (prefsRes.ok) {
        const data = (await prefsRes.json()) as NotificationPreferences;
        setPrefs(data);
        setEmailEnabled(data.job_notifications_enabled);
        setEmailThreshold(String(data.job_score_threshold));
        setSmsEnabled(data.sms_notifications_enabled);
        setSmsThreshold(String(data.sms_score_threshold));
        setSmsDailyLimit(String(data.sms_daily_limit));
        setPhoneNumber(data.phone_number ?? '');
      }
      if (identityRes.ok) {
        const data = (await identityRes.json()) as IdentityFields;
        setIdentity(data);
        setIdentityName(data.name ?? '');
        setIdentityEmail(data.email ?? '');
        setIdentityPhone(data.phone_number ?? '');
        setIdentityLocation(data.location ?? '');
        setIdentityLinkedin(data.linkedin_url ?? '');
        setIdentityWebsite(data.website_url ?? '');
      }
    } catch {
      toast({
        variant: 'error',
        title: 'Failed to load settings',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchPrefs();
  }, [fetchPrefs]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const notifBody: Record<string, unknown> = {
        job_notifications_enabled: emailEnabled,
        job_score_threshold: parseInt(emailThreshold, 10) || 100,
        sms_notifications_enabled: smsEnabled,
        sms_score_threshold: parseInt(smsThreshold, 10) || 100,
        sms_daily_limit: parseInt(smsDailyLimit, 10) || 5,
      };
      if (phoneNumber.trim()) {
        notifBody.phone_number = phoneNumber.trim();
      }
      const identityBody: Record<string, unknown> = {
        name: identityName.trim(),
        email: identityEmail.trim(),
        phone_number: identityPhone.trim(),
        location: identityLocation.trim(),
        linkedin_url: identityLinkedin.trim(),
        website_url: identityWebsite.trim(),
      };

      const [notifRes, identityRes] = await Promise.all([
        fetch('/api/profile/notifications', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(notifBody),
        }),
        fetch('/api/profile/identity', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(identityBody),
        }),
      ]);
      if (!notifRes.ok || !identityRes.ok) {
        const message =
          (await extractFastApiError(notifRes)) ||
          (await extractFastApiError(identityRes)) ||
          'Failed to save settings';
        toast({ variant: 'error', title: message });
        return;
      }

      const notifData = (await notifRes.json()) as NotificationPreferences;
      const identityData = (await identityRes.json()) as IdentityFields;
      setPrefs(notifData);
      setIdentity(identityData);
      toast({ variant: 'success', title: 'Settings saved' });
    } catch {
      toast({ variant: 'error', title: 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  }, [
    emailEnabled,
    emailThreshold,
    smsEnabled,
    smsThreshold,
    smsDailyLimit,
    phoneNumber,
    identityName,
    identityEmail,
    identityPhone,
    identityLocation,
    identityLinkedin,
    identityWebsite,
    toast,
  ]);

  const hasNotifChanges =
    prefs !== null &&
    (emailEnabled !== prefs.job_notifications_enabled ||
      emailThreshold !== String(prefs.job_score_threshold) ||
      smsEnabled !== prefs.sms_notifications_enabled ||
      smsThreshold !== String(prefs.sms_score_threshold) ||
      smsDailyLimit !== String(prefs.sms_daily_limit) ||
      phoneNumber !== (prefs.phone_number ?? ''));

  const hasIdentityChanges =
    identity !== null &&
    (identityName !== (identity.name ?? '') ||
      identityEmail !== (identity.email ?? '') ||
      identityPhone !== (identity.phone_number ?? '') ||
      identityLocation !== (identity.location ?? '') ||
      identityLinkedin !== (identity.linkedin_url ?? '') ||
      identityWebsite !== (identity.website_url ?? ''));

  const hasChanges = hasNotifChanges || hasIdentityChanges;

  const emailAvailable = prefs?.email_available ?? false;
  const smsAvailable = prefs?.sms_available ?? false;

  if (loading) {
    return (
      <div className='flex flex-col gap-6'>
        <div>
          <Skeleton variant='text' size='lg' className='w-32' />
          <Skeleton variant='text' className='mt-2 w-56' />
        </div>
        <Skeleton variant='rectangular' height={300} />
        <Skeleton variant='rectangular' height={250} />
      </div>
    );
  }

  return (
    <div className='flex flex-col gap-6'>
      <div className='flex items-center justify-between'>
        <div>
          <Heading variant='hero' as='h1'>
            Settings
          </Heading>
          <Text variant='body' className='mt-1 text-text-secondary'>
            Notification preferences and alerts
          </Text>
        </div>
        <Button
          name='save-settings'
          variant='primary'
          size='sm'
          onClick={handleSave}
          disabled={saving || !hasChanges}
        >
          {saving ? (
            <>
              <Spinner size='sm' aria-label='Saving' />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <Save className='size-4' aria-hidden />
              <span>Save</span>
            </>
          )}
        </Button>
      </div>

      {/* Profile (resume + cover-letter contact info) */}
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className='flex flex-col gap-4'>
          <Text variant='caption' className='text-text-secondary'>
            Used as the contact header on every generated resume and cover
            letter. Name is required before you can generate.
          </Text>
          <div className='grid gap-4 sm:grid-cols-2'>
            <Input
              label='Name'
              value={identityName}
              onChange={e => setIdentityName(e.target.value)}
              placeholder='Daniel Joffe'
              autoComplete='name'
              required
            />
            <Input
              label='Email'
              type='email'
              value={identityEmail}
              onChange={e => setIdentityEmail(e.target.value)}
              placeholder='you@example.com'
              autoComplete='email'
              inputMode='email'
            />
            <Input
              label='Phone'
              type='tel'
              value={identityPhone}
              onChange={e => setIdentityPhone(e.target.value)}
              placeholder='+1 555 123 4567'
              autoComplete='tel'
              inputMode='tel'
            />
            <Input
              label='Location'
              value={identityLocation}
              onChange={e => setIdentityLocation(e.target.value)}
              placeholder='Brooklyn, NY'
              autoComplete='address-level2'
            />
            <Input
              label='LinkedIn URL'
              type='url'
              value={identityLinkedin}
              onChange={e => setIdentityLinkedin(e.target.value)}
              placeholder='https://linkedin.com/in/...'
              autoComplete='url'
              inputMode='url'
            />
            <Input
              label='Website'
              type='url'
              value={identityWebsite}
              onChange={e => setIdentityWebsite(e.target.value)}
              placeholder='https://danieljoffe.com'
              autoComplete='url'
              inputMode='url'
            />
          </div>
        </CardContent>
      </Card>

      {/* Email Notifications */}
      <Card>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <CardTitle>Email Notifications</CardTitle>
            <Switch
              checked={emailEnabled && emailAvailable}
              onChange={setEmailEnabled}
              label='Enabled'
              disabled={!emailAvailable}
            />
          </div>
        </CardHeader>
        <CardContent className='flex flex-col gap-4'>
          <Text variant='caption' className='text-text-secondary'>
            Get email alerts when new jobs score above your threshold. Powered
            by Resend.
          </Text>
          {!emailAvailable && (
            <Text variant='meta' className='text-text-tertiary'>
              Email notifications are unavailable until the operator configures
              the email provider credentials.
            </Text>
          )}
          {prefs?.email && (
            <Text variant='meta' className='text-text-tertiary'>
              Sending to: {prefs.email}
            </Text>
          )}
          <div className='max-w-xs'>
            <Input
              label='Score threshold'
              type='number'
              value={emailThreshold}
              onChange={e => setEmailThreshold(e.target.value)}
              helperText='Minimum job score to trigger an email alert (0-200)'
              disabled={!emailEnabled || !emailAvailable}
            />
          </div>
        </CardContent>
      </Card>

      {/* SMS Notifications */}
      <Card>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <CardTitle>SMS Notifications</CardTitle>
            <Switch
              checked={smsEnabled && smsAvailable}
              onChange={setSmsEnabled}
              label='Enabled'
              disabled={!smsAvailable}
            />
          </div>
        </CardHeader>
        <CardContent className='flex flex-col gap-4'>
          <Text variant='caption' className='text-text-secondary'>
            Get text messages for high-scoring jobs with a deep link to view and
            act immediately. Powered by Twilio.
          </Text>
          {!smsAvailable && (
            <Text variant='meta' className='text-text-tertiary'>
              SMS notifications are unavailable until the operator configures
              Twilio credentials.
            </Text>
          )}
          <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
            <Input
              label='Phone number'
              type='tel'
              value={phoneNumber}
              onChange={e => setPhoneNumber(e.target.value)}
              placeholder='+1 555 123 4567'
              helperText='Include country code'
              autoComplete='tel'
              inputMode='tel'
              disabled={!smsEnabled || !smsAvailable}
            />
            <Input
              label='Score threshold'
              type='number'
              value={smsThreshold}
              onChange={e => setSmsThreshold(e.target.value)}
              helperText='Minimum score for SMS (0-200)'
              disabled={!smsEnabled || !smsAvailable}
            />
            <Input
              label='Daily limit'
              type='number'
              value={smsDailyLimit}
              onChange={e => setSmsDailyLimit(e.target.value)}
              helperText='Max texts per day (1-50)'
              disabled={!smsEnabled || !smsAvailable}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
