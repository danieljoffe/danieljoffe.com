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

const inputStyles = cn(BASE_FIELD, FIELD_PADDING, FIELD_PLACEHOLDER);

interface Source {
  id: string;
  board_token: string;
  company_name: string;
  enabled: boolean;
  last_polled_at: string | null;
  job_count: number;
}

export default function SourcesPanel() {
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [newToken, setNewToken] = useState('');
  const [newName, setNewName] = useState('');
  const [seeding, setSeeding] = useState(false);

  const fetchSources = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/jobs/sources', {
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        const data = await res.json();
        setSources(data.sources ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSources();
  }, [fetchSources]);

  const authHeaders = { 'Content-Type': 'application/json' };

  async function handleAdd() {
    if (!newToken || !newName) return;
    await fetch('/api/jobs/sources', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        action: 'add',
        board_token: newToken,
        company_name: newName,
      }),
    });
    setNewToken('');
    setNewName('');
    fetchSources();
  }

  async function handleToggle(boardToken: string) {
    await fetch('/api/jobs/sources', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ action: 'toggle', board_token: boardToken }),
    });
    fetchSources();
  }

  async function handleRemove(boardToken: string) {
    await fetch('/api/jobs/sources', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ action: 'remove', board_token: boardToken }),
    });
    fetchSources();
  }

  async function handleSeed() {
    setSeeding(true);
    try {
      await fetch('/api/jobs/sources', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ action: 'seed' }),
      });
      fetchSources();
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

      <div className='flex gap-2 items-end'>
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
          disabled={!newToken || !newName}
        >
          Add
        </Button>
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
                      variant='outline'
                      size='sm'
                      onClick={() => handleToggle(source.board_token)}
                    >
                      {source.enabled ? 'Disable' : 'Enable'}
                    </Button>
                    <Button
                      name={`remove-${source.board_token}`}
                      variant='outline'
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
