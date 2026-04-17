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

const inputStyles = cn(BASE_FIELD, FIELD_PADDING, FIELD_PLACEHOLDER);

interface Source {
  id: string;
  board_token: string;
  company_name: string;
  enabled: boolean;
  last_polled_at: string | null;
  job_count: number;
}

type VerifyState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'valid'; company_name: string }
  | { status: 'invalid' };

export default function SourcesPanel() {
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [newToken, setNewToken] = useState('');
  const [newName, setNewName] = useState('');
  const [verify, setVerify] = useState<VerifyState>({ status: 'idle' });
  const [seeding, setSeeding] = useState(false);
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

  async function handleVerify() {
    if (!newToken) return;
    setVerify({ status: 'loading' });
    try {
      const res = await fetch(
        `/api/jobs/sources/verify?board_token=${encodeURIComponent(newToken)}`
      );
      const data = await res.json();
      if (data.valid) {
        setVerify({ status: 'valid', company_name: data.company_name });
        setNewName(data.company_name);
      } else {
        setVerify({ status: 'invalid' });
      }
    } catch {
      setVerify({ status: 'invalid' });
    }
  }

  function handleTokenChange(value: string) {
    setNewToken(value);
    if (verify.status !== 'idle') setVerify({ status: 'idle' });
  }

  async function handleAdd() {
    if (!newToken || !newName) return;
    const ok = await runAction(
      { action: 'add', board_token: newToken, company_name: newName },
      `Added ${newName}`
    );
    if (ok) {
      setNewToken('');
      setNewName('');
      setVerify({ status: 'idle' });
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

  const canAdd = !!newToken && !!newName && verify.status !== 'loading';

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

      <div className='flex gap-2 items-end'>
        <div className='flex flex-col gap-1'>
          <label className='text-xs text-text-secondary'>Board Token</label>
          <input
            value={newToken}
            onChange={e => handleTokenChange(e.target.value)}
            placeholder='stripe'
            className={inputStyles}
          />
        </div>
        <Button
          name='verify-token'
          variant='outline'
          size='sm'
          onClick={handleVerify}
          disabled={!newToken || verify.status === 'loading'}
        >
          {verify.status === 'loading' ? 'Verifying...' : 'Verify'}
        </Button>
        <div className='flex flex-col gap-1'>
          <label className='text-xs text-text-secondary'>Company Name</label>
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder='Stripe'
            className={inputStyles}
          />
        </div>
        <Button
          name='add-source'
          variant='primary'
          size='sm'
          onClick={handleAdd}
          disabled={!canAdd}
        >
          Add
        </Button>
        {verify.status === 'valid' && (
          <Badge variant='success' size='sm'>
            Valid
          </Badge>
        )}
        {verify.status === 'invalid' && (
          <Badge variant='error' size='sm'>
            Invalid token
          </Badge>
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
