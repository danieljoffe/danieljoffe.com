'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@danieljoffe.com/shared-ui/Badge';
import { Card } from '@danieljoffe.com/shared-ui/Card';
import { Heading } from '@danieljoffe.com/shared-ui/Heading';
import { Spinner } from '@danieljoffe.com/shared-ui/Spinner';
import { Stack } from '@danieljoffe.com/shared-ui/Stack';
import { Text } from '@danieljoffe.com/shared-ui/Text';
import type {
  OptimizedDoc,
  OptimizedResponse,
  ProseDoc,
  ProseResponse,
} from './types';

interface CareerState {
  loading: boolean;
  error: string | null;
  prose: ProseDoc | null;
  optimized: OptimizedDoc | null;
}

function hasProse(value: ProseResponse): value is ProseDoc {
  return 'id' in value;
}

function hasOptimized(value: OptimizedResponse): value is OptimizedDoc {
  return 'id' in value;
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

async function fetchCareerData(): Promise<{
  prose: ProseDoc | null;
  optimized: OptimizedDoc | null;
}> {
  const [proseRes, optRes] = await Promise.all([
    fetch('/api/career/experience/prose', { cache: 'no-store' }),
    fetch('/api/career/experience/optimized', { cache: 'no-store' }),
  ]);

  if (!proseRes.ok) throw new Error(`Prose fetch failed (${proseRes.status})`);
  if (!optRes.ok) throw new Error(`Optimized fetch failed (${optRes.status})`);

  const proseBody = (await proseRes.json()) as ProseResponse;
  const optBody = (await optRes.json()) as OptimizedResponse;

  return {
    prose: hasProse(proseBody) ? proseBody : null,
    optimized: hasOptimized(optBody) ? optBody : null,
  };
}

export default function CareerOverview() {
  const [state, setState] = useState<CareerState>({
    loading: true,
    error: null,
    prose: null,
    optimized: null,
  });

  useEffect(() => {
    let cancelled = false;
    fetchCareerData()
      .then(data => {
        if (cancelled) return;
        setState({
          loading: false,
          error: null,
          prose: data.prose,
          optimized: data.optimized,
        });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setState({
          loading: false,
          error: err instanceof Error ? err.message : 'Failed to load career data',
          prose: null,
          optimized: null,
        });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (state.loading) {
    return (
      <div className='flex justify-center py-12'>
        <Spinner aria-label='Loading career data' />
      </div>
    );
  }

  if (state.error) {
    return (
      <Card>
        <Text variant='body'>Error loading career data: {state.error}</Text>
      </Card>
    );
  }

  const { prose, optimized } = state;

  return (
    <Stack gap='lg'>
      <Heading variant='section' as='h1'>
        Career
      </Heading>

      <Card>
        <Stack gap='md'>
          <div className='flex items-center justify-between'>
            <Heading variant='cardTitle' as='h2'>
              Prose doc
            </Heading>
            {prose ? (
              <Badge variant='info'>
                v{prose.version} · {formatDate(prose.created_at)}
              </Badge>
            ) : (
              <Badge variant='default'>Empty</Badge>
            )}
          </div>
          {prose ? (
            <pre className='whitespace-pre-wrap text-sm text-text-primary'>
              {prose.content}
            </pre>
          ) : (
            <Text variant='body'>
              No prose doc yet. Start an onboarding conversation to build one.
            </Text>
          )}
        </Stack>
      </Card>

      <Card>
        <Stack gap='md'>
          <div className='flex items-center justify-between'>
            <Heading variant='cardTitle' as='h2'>
              Optimized doc
            </Heading>
            {optimized ? (
              <Badge variant='info'>
                v{optimized.version} · {optimized.source} ·{' '}
                {formatDate(optimized.created_at)}
              </Badge>
            ) : (
              <Badge variant='default'>Empty</Badge>
            )}
          </div>
          {optimized ? (
            <Stack gap='sm'>
              {optimized.payload.summary && (
                <Text variant='body'>{optimized.payload.summary}</Text>
              )}
              <Text variant='detail'>
                {optimized.payload.roles.length} role
                {optimized.payload.roles.length === 1 ? '' : 's'} ·{' '}
                {optimized.payload.skills.length} skill
                {optimized.payload.skills.length === 1 ? '' : 's'} ·{' '}
                {optimized.payload.outcomes.length} outcome
                {optimized.payload.outcomes.length === 1 ? '' : 's'}
              </Text>
              {optimized.payload.roles.length > 0 && (
                <ul className='list-disc pl-5 text-sm text-text-primary'>
                  {optimized.payload.roles.map(role => (
                    <li key={role.id}>
                      <span className='font-medium'>{role.title}</span> at{' '}
                      {role.company}
                      {role.end
                        ? ` (${role.start} - ${role.end})`
                        : ` (${role.start} - present)`}
                    </li>
                  ))}
                </ul>
              )}
            </Stack>
          ) : (
            <Text variant='body'>
              No optimized doc yet. Derive one via POST /experience/derive once the
              prose doc has content.
            </Text>
          )}
        </Stack>
      </Card>
    </Stack>
  );
}
