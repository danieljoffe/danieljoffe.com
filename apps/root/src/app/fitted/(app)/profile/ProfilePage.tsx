'use client';

import { useCallback, useEffect, useState } from 'react';
import { Badge } from '@danieljoffe.com/shared-ui/Badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@danieljoffe.com/shared-ui/Card';
import { Heading } from '@danieljoffe.com/shared-ui/Heading';
import { Skeleton } from '@danieljoffe.com/shared-ui/Skeleton';
import { Text } from '@danieljoffe.com/shared-ui/Text';
import { useToast } from '@/state/Toast/ToastProvider';
import type {
  Gap,
  GapHealthResult,
  OptimizedDoc,
  OptimizedResponse,
} from './types';
import { GAP_KIND_LABELS, GAP_KIND_WEIGHTS, hasOptimized } from './types';

// -- Helpers ------------------------------------------------------------------

function formatDateRange(start: string, end: string | null): string {
  const fmt = (iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short' });
  };
  return end
    ? `${fmt(start)} \u2013 ${fmt(end)}`
    : `${fmt(start)} \u2013 Present`;
}

function gapBadgeVariant(kind: string): 'error' | 'warning' | 'default' {
  const w = GAP_KIND_WEIGHTS[kind] ?? 0;
  if (w >= 3) return 'error';
  if (w >= 1) return 'warning';
  return 'default';
}

// -- Component ----------------------------------------------------------------

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [optimized, setOptimized] = useState<OptimizedDoc | null>(null);
  const [gapHealth, setGapHealth] = useState<GapHealthResult | null>(null);
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    try {
      const [optRes, ghRes] = await Promise.all([
        fetch('/api/career/experience/optimized'),
        fetch('/api/career/experience/gap-health'),
      ]);

      if (optRes.ok) {
        const body = (await optRes.json()) as OptimizedResponse;
        setOptimized(hasOptimized(body) ? body : null);
      }

      if (ghRes.ok) {
        setGapHealth((await ghRes.json()) as GapHealthResult);
      }
    } catch {
      toast({ variant: 'error', title: 'Failed to load profile data' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // -- Loading state ----------------------------------------------------------

  if (loading) {
    return (
      <div className='flex flex-col gap-6'>
        <div>
          <Skeleton variant='text' size='lg' className='w-32' />
          <Skeleton variant='text' className='mt-2 w-56' />
        </div>
        <Skeleton variant='rectangular' height={200} />
        <Skeleton variant='rectangular' height={200} />
        <Skeleton variant='rectangular' height={140} />
      </div>
    );
  }

  // -- Zero state -------------------------------------------------------------

  if (!optimized) {
    return (
      <div className='flex flex-col gap-6'>
        <div>
          <Heading variant='component' as='h1'>
            Profile
          </Heading>
          <Text variant='body' className='mt-1 text-text-secondary'>
            Your experience and career health
          </Text>
        </div>

        <Card className='p-8 text-center'>
          <Text variant='body' className='text-text-secondary'>
            No profile data yet. Upload a resume or start a conversation from
            the Dashboard to get started.
          </Text>
        </Card>
      </div>
    );
  }

  // -- Main layout ------------------------------------------------------------

  const { payload } = optimized;
  const roleGapRefs = new Set(
    gapHealth?.gaps
      .filter(g => g.ref && g.kind.startsWith('role.'))
      .map(g => g.ref) ?? []
  );

  return (
    <div className='flex flex-col gap-6'>
      <div>
        <Heading variant='component' as='h1'>
          Profile
        </Heading>
        <Text variant='body' className='mt-1 text-text-secondary'>
          Your experience and career health
        </Text>
      </div>

      {/* Experience */}
      {payload.roles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Experience</CardTitle>
          </CardHeader>
          <CardContent className='flex flex-col divide-y divide-border'>
            {payload.roles.map(role => {
              const outcomeCount =
                payload.outcomes.filter(o => o.role_ref === role.id).length +
                role.outcome_refs.length;
              const hasGap = roleGapRefs.has(role.id);

              return (
                <div
                  key={role.id}
                  className='flex flex-col gap-2 py-3 first:pt-0 last:pb-0'
                >
                  <div className='flex items-start justify-between gap-2'>
                    <div>
                      <Text variant='body' className='font-medium'>
                        {role.title}
                      </Text>
                      <Text variant='caption' className='text-text-secondary'>
                        {role.company} &middot;{' '}
                        {formatDateRange(role.start, role.end)}
                      </Text>
                    </div>
                    <div className='flex shrink-0 items-center gap-1.5'>
                      {outcomeCount > 0 && (
                        <Badge variant='brand' size='sm'>
                          {outcomeCount}{' '}
                          {outcomeCount === 1 ? 'outcome' : 'outcomes'}
                        </Badge>
                      )}
                      {hasGap && (
                        <Badge variant='warning' size='sm'>
                          Has gaps
                        </Badge>
                      )}
                    </div>
                  </div>
                  {role.summary && (
                    <Text variant='caption' className='text-text-secondary'>
                      {role.summary}
                    </Text>
                  )}
                  {role.skills.length > 0 && (
                    <div className='flex flex-wrap gap-1'>
                      {role.skills.map(skill => (
                        <Badge key={skill} variant='default' size='sm'>
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Skills */}
      {payload.skills.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Skills</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-3'>
              {payload.skills.map(skill => (
                <div
                  key={skill.name}
                  className='flex items-center justify-between rounded-md border border-border px-3 py-2'
                >
                  <Text variant='body' className='text-sm'>
                    {skill.name}
                  </Text>
                  {skill.evidence_refs.length > 0 ? (
                    <Badge variant='default' size='sm'>
                      {skill.evidence_refs.length} evidence
                    </Badge>
                  ) : (
                    <Badge variant='error' size='sm'>
                      No evidence
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Gaps */}
      {gapHealth && gapHealth.gaps.length > 0 && (
        <GapsList gaps={gapHealth.gaps} />
      )}
    </div>
  );
}

// -- Sub-components -----------------------------------------------------------

function GapsList({ gaps }: { gaps: Gap[] }) {
  const visible = gaps.slice(0, 10);

  return (
    <Card>
      <CardHeader>
        <div className='flex items-center justify-between'>
          <CardTitle>Gaps to Fill</CardTitle>
          <Badge variant='default' size='sm'>
            {gaps.length} {gaps.length === 1 ? 'gap' : 'gaps'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className='flex flex-col divide-y divide-border'>
        {visible.map((gap, i) => (
          <div
            key={`${gap.kind}-${gap.ref}-${i}`}
            className='flex items-start gap-3 py-2.5 first:pt-0 last:pb-0'
          >
            <Badge
              variant={gapBadgeVariant(gap.kind)}
              size='sm'
              className='shrink-0 mt-0.5'
            >
              {GAP_KIND_LABELS[gap.kind] ?? gap.kind}
            </Badge>
            <Text variant='caption' className='text-text-secondary'>
              {gap.context}
            </Text>
          </div>
        ))}
        {gaps.length > 10 && (
          <Text variant='caption' className='pt-2 text-text-tertiary'>
            +{gaps.length - 10} more gaps
          </Text>
        )}
      </CardContent>
    </Card>
  );
}
