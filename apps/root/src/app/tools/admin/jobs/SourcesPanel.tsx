'use client';

import { useCallback, useEffect, useState } from 'react';
import { Badge } from '@danieljoffe.com/shared-ui/Badge';
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
import { PROVIDERS, type Provider } from './types';

const inputStyles = cn(BASE_FIELD, FIELD_PADDING, FIELD_PLACEHOLDER);
const selectStyles = cn(BASE_FIELD, FIELD_PADDING);

interface Source {
  id: string;
  board_token: string;
  company_name: string;
  provider: Provider;
  enabled: boolean;
  last_polled_at: string | null;
  job_count: number;
}

interface DetectResultData {
  provider: Provider;
  board_token: string;
  company_name: string;
  job_count: number;
}

type DetectState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'found'; data: DetectResultData }
  | { status: 'not_found' };

export default function SourcesPanel() {
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);

  // Detect flow
  const [detectInput, setDetectInput] = useState('');
  const [detect, setDetect] = useState<DetectState>({ status: 'idle' });

  // Advanced manual flow
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [newToken, setNewToken] = useState('');
  const [newName, setNewName] = useState('');
  const [newProvider, setNewProvider] = useState<Provider>('greenhouse');

  const { toast } = useToast();

  const fetchSources = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/jobs/sources', {
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        const data = await res.json();
        setSources(data.sources ?? []);
      } else {
        toast({ variant: 'error', title: 'Failed to load sources' });
      }
    } catch {
      toast({ variant: 'error', title: 'Failed to load sources' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchSources();
  }, [fetchSources]);

  const runAction = useCallback(
    async (
      body: Record<string, string>,
      successTitle: string
    ): Promise<boolean> => {
      try {
        const res = await fetch('/api/jobs/sources', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          toast({
            variant: 'error',
            title: 'Action failed',
            description:
              data?.error ?? `Request failed with status ${res.status}`,
          });
          return false;
        }
        toast({ variant: 'success', title: successTitle });
        return true;
      } catch (err) {
        toast({
          variant: 'error',
          title: 'Action failed',
          description: err instanceof Error ? err.message : 'Network error',
        });
        return false;
      }
    },
    [toast]
  );

  // --- Detect flow ---

  async function handleDetect() {
    if (!detectInput.trim()) return;
    setDetect({ status: 'loading' });
    try {
      const res = await fetch(
        `/api/jobs/sources/detect?q=${encodeURIComponent(detectInput.trim())}`
      );
      const data = await res.json();
      if (data.found) {
        setDetect({
          status: 'found',
          data: {
            provider: data.provider,
            board_token: data.board_token,
            company_name: data.company_name,
            job_count: data.job_count,
          },
        });
      } else {
        setDetect({ status: 'not_found' });
      }
    } catch {
      setDetect({ status: 'not_found' });
    }
  }

  function handleDetectInputChange(value: string) {
    setDetectInput(value);
    if (detect.status !== 'idle') setDetect({ status: 'idle' });
  }

  async function handleAddDetected() {
    if (detect.status !== 'found') return;
    const { provider, board_token, company_name } = detect.data;
    const ok = await runAction(
      { action: 'add', board_token, company_name, provider },
      `Added ${company_name}`
    );
    if (ok) {
      setDetectInput('');
      setDetect({ status: 'idle' });
      fetchSources();
    }
  }

  // --- Manual add flow ---

  async function handleManualAdd() {
    if (!newToken || !newName) return;
    const ok = await runAction(
      {
        action: 'add',
        board_token: newToken,
        company_name: newName,
        provider: newProvider,
      },
      `Added ${newName}`
    );
    if (ok) {
      setNewToken('');
      setNewName('');
      setNewProvider('greenhouse');
      fetchSources();
    }
  }

  async function handleToggle(boardToken: string, enabled: boolean) {
    const ok = await runAction(
      { action: 'toggle', board_token: boardToken },
      enabled ? 'Source disabled' : 'Source enabled'
    );
    if (ok) fetchSources();
  }

  async function handleRemove(boardToken: string) {
    const ok = await runAction(
      { action: 'remove', board_token: boardToken },
      'Source removed'
    );
    if (ok) fetchSources();
  }

  async function handleSeed() {
    setSeeding(true);
    try {
      const ok = await runAction({ action: 'seed' }, 'Seeded defaults');
      if (ok) fetchSources();
    } finally {
      setSeeding(false);
    }
  }

  if (loading) {
    return (
      <div className='flex justify-center py-12'>
        <Spinner aria-label='Loading sources' />
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <Heading variant='section' as='h2'>
          Company Sources ({sources.length})
        </Heading>
        <Button
          name='seed-sources'
          variant='outline'
          size='sm'
          onClick={handleSeed}
          disabled={seeding}
        >
          {seeding ? 'Seeding...' : 'Seed defaults'}
        </Button>
      </div>

      {/* Detect flow */}
      <div className='space-y-3'>
        <div className='flex gap-2 items-end'>
          <div className='flex flex-col gap-1 flex-1'>
            <label className='text-xs text-text-secondary'>
              Company name or careers URL
            </label>
            <input
              value={detectInput}
              onChange={e => handleDetectInputChange(e.target.value)}
              placeholder='stripe, jobs.lever.co/netlify, notion.so/careers'
              className={inputStyles}
            />
          </div>
          <Button
            name='detect-ats'
            variant='primary'
            size='sm'
            onClick={handleDetect}
            disabled={!detectInput.trim() || detect.status === 'loading'}
          >
            {detect.status === 'loading' ? 'Detecting...' : 'Detect'}
          </Button>
        </div>

        {detect.status === 'found' && (
          <div className='flex items-center gap-3 p-3 rounded-lg border border-border bg-surface-secondary'>
            <div className='flex-1 flex items-center gap-3'>
              <Badge variant='info' size='sm'>
                {detect.data.provider}
              </Badge>
              <span className='font-medium'>{detect.data.company_name}</span>
              <span className='text-text-tertiary font-mono text-xs'>
                {detect.data.board_token}
              </span>
              <span className='text-text-tertiary text-sm'>
                {detect.data.job_count} jobs
              </span>
            </div>
            <Button
              name='add-detected-source'
              variant='primary'
              size='sm'
              onClick={handleAddDetected}
            >
              Add
            </Button>
          </div>
        )}

        {detect.status === 'not_found' && (
          <Text variant='body' className='text-text-tertiary text-sm'>
            No ATS provider detected. Try the manual form below.
          </Text>
        )}
      </div>

      {/* Advanced manual add */}
      <div>
        <button
          type='button'
          className='text-xs text-text-tertiary hover:text-text-secondary transition-colors'
          onClick={() => setShowAdvanced(!showAdvanced)}
        >
          {showAdvanced ? 'Hide' : 'Show'} manual entry
        </button>

        {showAdvanced && (
          <div className='flex gap-2 items-end mt-2'>
            <div className='flex flex-col gap-1'>
              <label className='text-xs text-text-secondary'>Provider</label>
              <select
                value={newProvider}
                onChange={e => setNewProvider(e.target.value as Provider)}
                className={selectStyles}
              >
                {PROVIDERS.map(p => (
                  <option key={p} value={p}>
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div className='flex flex-col gap-1'>
              <label className='text-xs text-text-secondary'>Board Token</label>
              <input
                value={newToken}
                onChange={e => setNewToken(e.target.value)}
                placeholder='stripe'
                className={inputStyles}
              />
            </div>
            <div className='flex flex-col gap-1'>
              <label className='text-xs text-text-secondary'>
                Company Name
              </label>
              <input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder='Stripe'
                className={inputStyles}
              />
            </div>
            <Button
              name='add-source-manual'
              variant='primary'
              size='sm'
              onClick={handleManualAdd}
              disabled={!newToken || !newName}
            >
              Add
            </Button>
          </div>
        )}
      </div>

      <div className='overflow-x-auto'>
        <table className='w-full text-sm'>
          <thead>
            <tr className='border-b border-border text-left'>
              <th
                scope='col'
                className='px-3 py-2 font-medium text-text-secondary'
              >
                Company
              </th>
              <th
                scope='col'
                className='px-3 py-2 font-medium text-text-secondary'
              >
                Provider
              </th>
              <th
                scope='col'
                className='px-3 py-2 font-medium text-text-secondary'
              >
                Token
              </th>
              <th
                scope='col'
                className='px-3 py-2 font-medium text-text-secondary'
              >
                Jobs
              </th>
              <th
                scope='col'
                className='px-3 py-2 font-medium text-text-secondary'
              >
                Last Polled
              </th>
              <th
                scope='col'
                className='px-3 py-2 font-medium text-text-secondary'
              >
                Status
              </th>
              <th
                scope='col'
                className='px-3 py-2 font-medium text-text-secondary'
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {sources.map(source => (
              <tr key={source.id} className='border-b border-border'>
                <td className='px-3 py-2 font-medium'>{source.company_name}</td>
                <td className='px-3 py-2'>
                  <Badge variant='info' size='sm'>
                    {source.provider ?? 'greenhouse'}
                  </Badge>
                </td>
                <td className='px-3 py-2 text-text-tertiary font-mono text-xs'>
                  {source.board_token}
                </td>
                <td className='px-3 py-2'>{source.job_count}</td>
                <td className='px-3 py-2 text-text-tertiary'>
                  {source.last_polled_at
                    ? new Date(source.last_polled_at).toLocaleDateString()
                    : 'Never'}
                </td>
                <td className='px-3 py-2'>
                  <Badge
                    variant={source.enabled ? 'success' : 'default'}
                    size='sm'
                  >
                    {source.enabled ? 'Active' : 'Disabled'}
                  </Badge>
                </td>
                <td className='px-3 py-2'>
                  <div className='flex gap-2'>
                    <Button
                      name={`toggle-${source.board_token}`}
                      variant={source.enabled ? 'warning' : 'primary'}
                      size='sm'
                      onClick={() =>
                        handleToggle(source.board_token, source.enabled)
                      }
                    >
                      {source.enabled ? 'Disable' : 'Enable'}
                    </Button>
                    <Button
                      name={`remove-${source.board_token}`}
                      variant='error'
                      size='sm'
                      onClick={() => handleRemove(source.board_token)}
                    >
                      Remove
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {sources.length === 0 && (
        <Text variant='body' className='text-center py-8 text-text-tertiary'>
          No sources configured. Click &ldquo;Seed defaults&rdquo; to add ~50
          companies.
        </Text>
      )}
    </div>
  );
}
