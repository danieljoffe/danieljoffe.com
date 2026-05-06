'use client';

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
import { Card, CardContent } from '@danieljoffe.com/shared-ui/Card';
import { Heading } from '@danieljoffe.com/shared-ui/Heading';
import { Text } from '@danieljoffe.com/shared-ui/Text';
import Button from '@/components/Button';
import type { JobPosting } from './jobs/types';

export interface DashboardInitial {
  topMatches: JobPosting[];
  counts: Record<string, number>;
  hasProfile: boolean;
  hasActiveTargets: boolean;
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
    href: '/jobs?status=new',
  },
  {
    status: 'saved',
    label: 'Saved',
    icon: <Briefcase className='size-4' aria-hidden />,
    href: '/jobs?status=saved',
  },
  {
    status: 'resume_draft',
    label: 'Drafts',
    icon: <FileEdit className='size-4' aria-hidden />,
    href: '/jobs?status=resume_draft',
  },
  {
    status: 'applied',
    label: 'Applied',
    icon: <Send className='size-4' aria-hidden />,
    href: '/jobs?status=applied',
  },
];

function scoreBadgeVariant(score: number): 'success' | 'brand' | 'default' {
  if (score >= 80) return 'success';
  if (score >= 60) return 'brand';
  return 'default';
}

// -- Component ----------------------------------------------------------------

interface DashboardPageProps {
  initial: DashboardInitial;
}

export default function DashboardPage({ initial }: DashboardPageProps) {
  const { topMatches, counts, hasProfile, hasActiveTargets } = initial;

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
                href='/profile'
              >
                <span>Set up profile</span>
                <ArrowRight className='size-4' aria-hidden />
              </Button>
              <Button
                name='dashboard-start-conversation'
                variant='outline'
                size='sm'
                as='link'
                href='/onboarding'
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
              href='/targets'
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
      <div>
        <Heading variant='hero' as='h1'>
          Dashboard
        </Heading>
        <Text variant='body' className='mt-1 text-text-secondary'>
          Your job search at a glance
        </Text>
      </div>

      {/* Pipeline stats */}
      <div className='grid grid-cols-2 gap-3 sm:grid-cols-4'>
        {PIPELINE_STATS.map(stat => (
          <Link
            key={stat.status}
            href={stat.href}
            className='group flex flex-col gap-1 rounded-lg border border-border bg-surface-secondary p-3 transition-colors hover:border-brand hover:bg-surface-tertiary sm:gap-2 sm:p-4'
          >
            <div className='flex items-center gap-2 text-text-secondary group-hover:text-text-primary'>
              {stat.icon}
              <Text variant='caption' className='text-text-secondary'>
                {stat.label}
              </Text>
            </div>
            <Text
              variant='body'
              as='span'
              className='text-lg font-semibold sm:text-2xl'
            >
              {counts[stat.status] ?? 0}
            </Text>
          </Link>
        ))}
      </div>

      {/* Top matches */}
      <section className='flex flex-col gap-3'>
        <Heading variant='component' as='h2'>
          Top matches
        </Heading>
        {topMatches.length === 0 ? (
          <Card>
            <CardContent className='flex flex-col items-center gap-3 py-8 text-center'>
              <CheckCircle2
                className='size-10 text-text-tertiary'
                aria-hidden
              />
              <Text variant='body' className='text-text-secondary'>
                No new matches right now. We&apos;ll notify you as fresh roles
                come in.
              </Text>
            </CardContent>
          </Card>
        ) : (
          <div className='flex flex-col gap-2'>
            {topMatches.map(posting => (
              <Link
                key={posting.id}
                href={`/jobs/${posting.id}`}
                className='group flex min-w-0 items-start gap-3 rounded-xl border border-border bg-surface-elevated p-3 transition-colors hover:bg-surface-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2'
              >
                <Badge
                  variant={scoreBadgeVariant(posting.score)}
                  size='sm'
                  className='shrink-0'
                >
                  {posting.score}
                </Badge>
                <div className='min-w-0 flex-1'>
                  <Text
                    variant='body'
                    className='truncate text-sm font-semibold leading-tight group-hover:text-brand-500'
                  >
                    {posting.title}
                  </Text>
                  <Text
                    variant='caption'
                    className='truncate text-text-secondary'
                  >
                    {posting.company_name}
                    {posting.location ? ` · ${posting.location}` : ''}
                  </Text>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
