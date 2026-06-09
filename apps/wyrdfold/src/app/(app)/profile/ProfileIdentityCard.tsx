'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@danieljoffe/shared-ui/Card';
import { Input } from '@danieljoffe/shared-ui/Input';
import { Spinner } from '@danieljoffe/shared-ui/Spinner';
import { Text } from '@danieljoffe/shared-ui/Text';
import { extractApiError } from '@/lib/extractApiError';
import { useToast } from '@/state/Toast/ToastProvider';

/**
 * Identity / contact fields that appear in the header of every generated
 * resume and cover letter. Lives on the Profile page (was previously stacked
 * inside Settings — moved here because the data is semantically part of the
 * candidate's profile, not their notification preferences).
 *
 * Fully self-contained: fetches its own data, owns its own form state, and
 * debounces saves back to `/api/profile/identity`. No props.
 */

const AUTOSAVE_DEBOUNCE_MS = 800;

interface IdentityFields {
  name: string | null;
  email: string | null;
  phone_number: string | null;
  location: string | null;
  linkedin_url: string | null;
  website_url: string | null;
}

function identitySig(fields: {
  name: string;
  email: string;
  phone_number: string;
  location: string;
  linkedin_url: string;
  website_url: string;
}): string {
  return JSON.stringify(fields);
}

export default function ProfileIdentityCard() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [website, setWebsite] = useState('');

  // Server-known signature — autosave fires only when local state diverges.
  // Failed-sig prevents retry-loops when the server rejects a value.
  const lastSigRef = useRef<string | null>(null);
  const lastFailedSigRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/profile/identity')
      .then(async res => {
        if (cancelled || !res.ok) return;
        const data = (await res.json()) as IdentityFields;
        if (cancelled) return;
        setName(data.name ?? '');
        setEmail(data.email ?? '');
        setPhone(data.phone_number ?? '');
        setLocation(data.location ?? '');
        setLinkedin(data.linkedin_url ?? '');
        setWebsite(data.website_url ?? '');
        lastSigRef.current = identitySig({
          name: (data.name ?? '').trim(),
          email: (data.email ?? '').trim(),
          phone_number: (data.phone_number ?? '').trim(),
          location: (data.location ?? '').trim(),
          linkedin_url: (data.linkedin_url ?? '').trim(),
          website_url: (data.website_url ?? '').trim(),
        });
      })
      .catch(() => {
        if (!cancelled) {
          toast({ variant: 'error', title: 'Failed to load identity' });
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [toast]);

  const handleSave = useCallback(async () => {
    const trimmed = {
      name: name.trim(),
      email: email.trim(),
      phone_number: phone.trim(),
      location: location.trim(),
      linkedin_url: linkedin.trim(),
      website_url: website.trim(),
    };
    const sig = identitySig(trimmed);
    setSaving(true);
    try {
      const res = await fetch('/api/profile/identity', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(trimmed),
      });
      if (!res.ok) {
        const message = await extractApiError(res, 'Failed to save identity');
        toast({ variant: 'error', title: message });
        lastFailedSigRef.current = sig;
        return;
      }
      const data = (await res.json()) as IdentityFields;
      // Re-sync from server response so normalized values (e.g. E.164 phone)
      // replace the typed input.
      setName(data.name ?? '');
      setEmail(data.email ?? '');
      setPhone(data.phone_number ?? '');
      setLocation(data.location ?? '');
      setLinkedin(data.linkedin_url ?? '');
      setWebsite(data.website_url ?? '');
      lastSigRef.current = identitySig({
        name: (data.name ?? '').trim(),
        email: (data.email ?? '').trim(),
        phone_number: (data.phone_number ?? '').trim(),
        location: (data.location ?? '').trim(),
        linkedin_url: (data.linkedin_url ?? '').trim(),
        website_url: (data.website_url ?? '').trim(),
      });
      lastFailedSigRef.current = null;
      toast({ variant: 'success', title: 'Identity saved' });
    } catch {
      lastFailedSigRef.current = sig;
      toast({ variant: 'error', title: 'Network error saving identity' });
    } finally {
      setSaving(false);
    }
  }, [name, email, phone, location, linkedin, website, toast]);

  // Debounced autosave. Skip while still loading initial data and while a save
  // is in flight. Also skip a sig that already failed once — the user has to
  // edit it again before we retry.
  useEffect(() => {
    if (loading || saving) return;
    if (lastSigRef.current === null) return;
    const sig = identitySig({
      name: name.trim(),
      email: email.trim(),
      phone_number: phone.trim(),
      location: location.trim(),
      linkedin_url: linkedin.trim(),
      website_url: website.trim(),
    });
    if (sig === lastSigRef.current) return;
    if (sig === lastFailedSigRef.current) return;
    const t = setTimeout(handleSave, AUTOSAVE_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [
    name,
    email,
    phone,
    location,
    linkedin,
    website,
    loading,
    saving,
    handleSave,
  ]);

  return (
    <Card>
      <CardHeader>
        <div className='flex items-center justify-between gap-3'>
          <CardTitle>Identity</CardTitle>
          {saving && (
            <Text
              as='span'
              variant='meta'
              className='inline-flex items-center gap-1'
              aria-live='polite'
            >
              <Spinner size='sm' aria-label='Saving' />
              <span>Saving…</span>
            </Text>
          )}
        </div>
      </CardHeader>
      <CardContent className='flex flex-col gap-4'>
        <Text variant='caption' className='text-text-secondary'>
          Used as the contact header on every generated resume and cover letter.
          Name is required before you can generate.
        </Text>
        <div className='grid gap-4 sm:grid-cols-2'>
          <Input
            label='Name'
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder='Full name'
            autoComplete='name'
            required
            data-sentry-mask
          />
          <Input
            label='Email'
            type='email'
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder='name@example.com'
            autoComplete='email'
            inputMode='email'
            data-sentry-mask
          />
          <Input
            label='Phone'
            type='tel'
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder='+1 555 555 5555'
            autoComplete='tel'
            inputMode='tel'
            data-sentry-mask
          />
          <Input
            label='Location'
            value={location}
            onChange={e => setLocation(e.target.value)}
            placeholder='City, State'
            autoComplete='address-level2'
            data-sentry-mask
          />
          <Input
            label='LinkedIn URL'
            type='url'
            value={linkedin}
            onChange={e => setLinkedin(e.target.value)}
            placeholder='https://linkedin.com/in/username'
            autoComplete='url'
            inputMode='url'
            data-sentry-mask
          />
          <Input
            label='Website'
            type='url'
            value={website}
            onChange={e => setWebsite(e.target.value)}
            placeholder='https://example.com'
            autoComplete='url'
            inputMode='url'
            data-sentry-mask
          />
        </div>
      </CardContent>
    </Card>
  );
}
