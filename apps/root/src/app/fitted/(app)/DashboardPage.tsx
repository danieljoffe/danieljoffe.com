'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Briefcase,
  CheckCircle2,
  FileEdit,
  Send,
  Sparkles,
  Star,
  Target,
} from 'lucide-react';
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
import Button from '@/components/Button';
import { useToast } from '@/state/Toast/ToastProvider';
import type { GapHealthResult, GapTier } from './profile/types';
import type { JobPosting } from './jobs/types';
import type { UserTargetWithTarget } from './targets/types';

interface JobsListResponse {
  postings: JobPosting[];
  total: number;
  page: number;
  page_size: number;
}

interface PipelineStat {
  status: 'new' | 'saved' | 'resume_draft' | 'applied';
  label: string;
  icon: React.ReactNode;
  href: string;
}

const PIPELINE_STATS: PipelineStat[] = [
  {
    status: 'new',
    label: 'New matches',
    icon: <Star className='size-4' aria-hidden />,
    href: '/fitted/jobs?status=new',
  },
  {
    status: 'saved',
    label: 'Saved',
    icon: <Briefcase className='size-4' aria-hidden />,
    href: '/fitted/jobs?status=saved',
  },
  {
    status: 'resume_draft',
    label: 'Drafts',
    icon: <FileEdit className='size-4' aria-hidden />,
    href: '/fitted/jobs?status=resume_draft',
  },
  {
    status: 'applied',
    label: 'Applied',
    icon: <Send className='size-4' aria-hidden />,
    href: '/fitted/jobs?status=applied',
  },
];

function tierToBadgeVariant(tier: GapTier): 'error' | 'warning' | 'success' {
  if (tier === 'red') return 'error';
  if (tier === 'yellow') return 'warning';
  return 'success';
}

function scoreBadgeVariant(score: number): 'success' | 'brand' | 'default' {
  if (score >= 80) return 'success';
  if (score >= 60) return 'brand';
  return 'default';
}

// -- Component ----------------------------------------------------------------

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [topMatches, setTopMatches] = useState<JobPosting[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [gapHealth, setGapHealth] = useState<GapHealthResult | null>(null);
  const [hasProfile, setHasProfile] = useState<boolean>(false);
  const [hasActiveTargets, setHasActiveTargets] = useState<boolean>(false);
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    try {
      const [topRes, healthRes, targetsRes, ...countResponses] =
        await Promise.all([
          fetch('/api/jobs?status=new&sort=score&order=desc&page_size=5'),
          fetch('/api/career/experience/gap-health'),
          fetch('/api/targets/mine'),
          ...PIPELINE_STATS.map(s =>
            fetch(`/api/jobs?status=${s.status}&page_size=1`)
          ),
        ]);

      if (topRes.ok) {
        const data = (await topRes.json()) as JobsListResponse;
        setTopMatches(data.postings ?? []);
      }

      if (healthRes.ok) {
        const data = (await healthRes.json()) as GapHealthResult;
        setGapHealth(data);
        setHasProfile(true);
      }

      if (targetsRes.ok) {
        const { targets } = (await targetsRes.json()) as {
          targets: UserTargetWithTarget[];
        };
        setHasActiveTargets(targets.some(t => t.user_target.is_active));
      }

      const newCounts: Record<string, number> = {};
      await Promise.all(
        countResponses.map(async (res, i) => {
          if (res.ok) {
            const data = (await res.json()) as JobsListResponse;
            const stat = PIPELINE_STATS[i];
            if (stat) newCounts[stat.status] = data.total ?? 0;
          }
        })
      );
      setCounts(newCounts);
    } catch {
      toast({ variant: 'error', title: 'Failed to load dashboard data' });
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
        <div className='grid grid-cols-2 gap-3 sm:grid-cols-4'>
          {[0, 1, 2, 3].map(i => (
            <Skeleton key={i} variant='rectangular' height={88} />
          ))}
        </div>
        <Skeleton variant='rectangular' height={320} />
      </div>
    );
  }

  // -- Zero state -------------------------------------------------------------

  if (!hasProfile) {
    return (
      <div className='flex flex-col gap-6'>
        <div>
          <Heading variant='hero' as='h1'>
            Dashboard
          </Heading>
          <Text variant='body' className='mt-1 text-text-secondary'>
            Your job search at a glance
          </Text>
        </div>

        <Card>
          <CardContent className='flex flex-col items-center gap-4 py-12'>
            <Sparkles className='size-12 text-text-tertiary' aria-hidden />
            <Text variant='body' as='p' className='text-center'>
              Build your profile so we can score and match incoming jobs.
            </Text>
            <div className='flex items-center gap-3'>
              <Button
                name='dashboard-go-profile'
                variant='primary'
                size='sm'
                as='link'
                href='/fitted/profile'
              >
                <span>Set up profile</span>
                <ArrowRight className='size-4' aria-hidden />
              </Button>
              <Button
                name='dashboard-start-conversation'
                variant='outline'
                size='sm'
                as='link'
                href='/fitted/onboarding'
              >
                <Sparkles className='size-4' aria-hidden />
                <span>Start with AI</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!hasActiveTargets) {
    return (
      <div className='flex flex-col gap-6'>
        <div>
          <Heading variant='hero' as='h1'>
            Dashboard
          </Heading>
          <Text variant='body' className='mt-1 text-text-secondary'>
            Your job search at a glance
          </Text>
        </div>

        <Card>
          <CardContent className='flex flex-col items-center gap-4 py-12'>
            <Target className='size-12 text-text-tertiary' aria-hidden />
            <Text variant='body' as='p' className='text-center'>
              Activate a target so we can match incoming jobs to the roles
              you&apos;re actually pursuing.
            </Text>
            <Button
              name='dashboard-go-targets'
              variant='primary'
              size='sm'
              as='link'
              href='/fitted/targets'
            >
              <span>Manage targets</span>
              <ArrowRight className='size-4' aria-hidden />
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // -- Main layout ------------------------------------------------------------

  return (
    <div className='flex flex-col gap-6'>
      <div className='flex items-start justify-between gap-3'>
        <div>
          <Heading variant='hero' as='h1'>
            Dashboard
          </Heading>
          <Text variant='body' className='mt-1 text-text-secondary'>
            Your job search at a glance
          </Text>
        </div>
        {gapHealth && (
          <Link
            href='/fitted/profile'
            className='group flex items-center gap-2 rounded-lg border border-border bg-surface-secondary px-3 py-2 transition-colors hover:bg-surface-tertiary'
          >
            <Badge variant={tierToBadgeVariant(gapHealth.tier)} size='sm'>
              Profile {Math.round(100 - gapHealth.gap_pct)}%
            </Badge>
            <ArrowRight
              className='size-4 text-text-tertiary transition-transform group-hover:translate-x-0.5'
              aria-hidden
            />
          </Link>
        )}
      </div>

      {/* Pipeline stats */}
      <div className='grid grid-cols-2 gap-3 sm:grid-cols-4'>
        {PIPELINE_STATS.map(stat => (
          <Link
            key={stat.status}
            href={stat.href}
            className='group flex flex-col gap-2 rounded-lg border border-border bg-surface-secondary p-4 transition-colors hover:border-brand hover:bg-surface-tertiary'
          >
            <div className='flex items-center gap-2 text-text-secondary group-hover:text-text-primary'>
              {stat.icon}
              <Text variant='caption' className='text-text-secondary'>
                {stat.label}
              </Text>
            </div>
            <Text variant='body' as='span' className='text-2xl font-semibold'>
              {counts[stat.status] ?? 0}
            </Text>
          </Link>
        ))}
      </div>

      {/* Top matches */}
      <Card>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <CardTitle>
              <Star className='mr-2 inline size-5' aria-hidden />
              Top matches
            </CardTitle>
            <Link
              href='/fitted/jobs'
              className='inline-flex items-center gap-1 text-sm text-brand-500 hover:underline'
            >
              View all jobs
              <ArrowRight className='size-3.5' aria-hidden />
            </Link>
          </div>
        </CardHeader>
        <CardContent className='flex flex-col divide-y divide-border'>
          {topMatches.length === 0 ? (
            <div className='flex flex-col items-center gap-3 py-8 text-center'>
              <CheckCircle2
                className='size-10 text-text-tertiary'
                aria-hidden
              />
              <Text variant='body' className='text-text-secondary'>
                No new matches right now. We&apos;ll notify you as fresh roles
                come in.
              </Text>
            </div>
          ) : (
            topMatches.map(posting => (
              <Link
                key={posting.id}
                href={`/fitted/jobs/${posting.id}`}
                className='group flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0 transition-colors hover:bg-surface-tertiary -mx-3 px-3 rounded-md'
              >
                <div className='min-w-0 flex-1'>
                  <Text
                    variant='body'
                    className='truncate font-medium group-hover:text-brand-500'
                  >
                    {posting.title}
                  </Text>
                  <Text variant='caption' className='text-text-secondary'>
                    {posting.company_name}
                    {posting.location ? ` · ${posting.location}` : ''}
                  </Text>
                </div>
                <Badge variant={scoreBadgeVariant(posting.score)} size='sm'>
                  {posting.score}
                </Badge>
              </Link>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
