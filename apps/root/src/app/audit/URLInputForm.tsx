'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Monitor, Smartphone } from 'lucide-react';
import { analytics } from '@/lib/analytics';
import Button from '@/components/Button';
import { Spinner, ErrorAlert, FormFieldError } from '@/components/kit';
import { inputStyles, inputErrorStyles } from '@/lib/formStyles';

type DeviceSelection = 'mobile' | 'desktop' | 'both';

type ScanState =
  | { phase: 'idle' }
  | { phase: 'submitting' }
  | { phase: 'error'; message: string };

/** Client-safe URL validation (no node:crypto dependency). */
function isValidClientUrl(url: string): boolean {
  try {
    let normalized = url.trim();
    if (
      !normalized.startsWith('http://') &&
      !normalized.startsWith('https://')
    ) {
      normalized = `https://${normalized}`;
    }
    if (/\s/.test(normalized)) return false;
    const parsed = new URL(normalized);
    if (!['http:', 'https:'].includes(parsed.protocol)) return false;
    if (!parsed.hostname.includes('.')) return false;
    return true;
  } catch {
    return false;
  }
}

const DEVICE_OPTIONS: { value: DeviceSelection; label: string }[] = [
  { value: 'mobile', label: 'Mobile' },
  { value: 'desktop', label: 'Desktop' },
  { value: 'both', label: 'Both' },
];

export default function URLInputForm() {
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [device, setDevice] = useState<DeviceSelection>('mobile');
  const [validationError, setValidationError] = useState('');
  const [state, setState] = useState<ScanState>({ phase: 'idle' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    const trimmed = url.trim();
    if (!trimmed) {
      setValidationError('Please enter a URL.');
      return;
    }
    if (!isValidClientUrl(trimmed)) {
      setValidationError('Please enter a valid URL (e.g. example.com).');
      return;
    }

    setState({ phase: 'submitting' });

    try {
      const res = await fetch('/api/audit/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: trimmed, source: 'organic', device }),
      });

      const data = await res.json();

      if (!res.ok) {
        const message =
          res.status === 429
            ? 'Too many scans. Please try again in an hour.'
            : data.error || 'Something went wrong. Please try again.';
        analytics.auditScanFailed(trimmed, message);
        setState({ phase: 'error', message });
        return;
      }

      analytics.auditScanStarted(trimmed);

      if (data.cached) {
        // Cached scan — report already in DB, no searchParams needed
        router.push(`/audit/r/${data.scan_id}`);
        return;
      }

      // Redirect to report page — it handles pending/completed/failed states.
      // Pass url & device as searchParams so the page can render the polling UI
      // even before the DB record is visible to the server component.
      const sp = new URLSearchParams({ url: trimmed, device });
      router.push(`/audit/r/${data.scan_id}?${sp}`);
    } catch {
      const message = 'Network error. Please try again.';
      analytics.auditScanFailed(trimmed, message);
      setState({ phase: 'error', message });
    }
  };

  return (
    <div className='flex flex-col gap-2 w-full max-w-md'>
      <form onSubmit={handleSubmit} noValidate>
        <div className='flex flex-col gap-2'>
          <div className='w-full'>
            <input
              type='url'
              value={url}
              onChange={e => {
                setUrl(e.target.value);
                if (validationError) setValidationError('');
              }}
              onBlur={() => {
                if (url.trim() && !isValidClientUrl(url.trim())) {
                  setValidationError(
                    'Please enter a valid URL (e.g. example.com).'
                  );
                }
              }}
              placeholder='https://example.com'
              aria-label='Website URL'
              aria-describedby={validationError ? 'url-error' : undefined}
              disabled={state.phase === 'submitting'}
              className={validationError ? inputErrorStyles : inputStyles}
            />
            <FormFieldError message={validationError} id='url-error' />
          </div>
          <fieldset
            className='flex justify-around'
            aria-label='Device type'
            disabled={state.phase === 'submitting'}
          >
            {DEVICE_OPTIONS.map(opt => {
              const selected = device === opt.value;
              return (
                <label
                  key={opt.value}
                  className={`flex items-center gap-2 cursor-pointer text-sm font-medium transition-colors ${
                    selected
                      ? 'text-text-primary'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <input
                    type='radio'
                    name='device'
                    value={opt.value}
                    checked={selected}
                    onChange={() => setDevice(opt.value)}
                    className='sr-only peer'
                  />
                  <span
                    className={`inline-flex items-center justify-center size-5 rounded-full border-2 transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-border-focus peer-focus-visible:ring-offset-2 ${
                      selected
                        ? 'border-brand-500 bg-brand-500 text-background'
                        : 'border-border bg-surface'
                    }`}
                    aria-hidden='true'
                  >
                    {selected && <Check className='size-3' strokeWidth={3} />}
                  </span>
                  {opt.value === 'mobile' && (
                    <Smartphone className='size-4' aria-hidden='true' />
                  )}
                  {opt.value === 'desktop' && (
                    <Monitor className='size-4' aria-hidden='true' />
                  )}
                  {opt.value === 'both' && (
                    <>
                      <Smartphone className='size-3.5' aria-hidden='true' />
                      <span aria-hidden='true'>+</span>
                      <Monitor className='size-3.5' aria-hidden='true' />
                    </>
                  )}
                  {opt.label}
                </label>
              );
            })}
          </fieldset>
          <Button
            type='submit'
            name='audit-submit'
            size='lg'
            disabled={state.phase === 'submitting'}
            className='w-full'
          >
            {state.phase === 'submitting' ? (
              <>
                <Spinner size='sm' label='Starting scan' />
                Starting scan...
              </>
            ) : (
              'Audit this site'
            )}
          </Button>
        </div>
      </form>
      {state.phase === 'error' && (
        <ErrorAlert
          message={state.message}
          onRetry={() => setState({ phase: 'idle' })}
        />
      )}
    </div>
  );
}
