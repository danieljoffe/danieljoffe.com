'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { Badge } from '@danieljoffe.com/shared-ui/Badge';
import { Card, CardContent } from '@danieljoffe.com/shared-ui/Card';
import { Heading } from '@danieljoffe.com/shared-ui/Heading';
import { Skeleton } from '@danieljoffe.com/shared-ui/Skeleton';
import { Text } from '@danieljoffe.com/shared-ui/Text';
import { useToast } from '@/state/Toast/ToastProvider';
import JobDetailPanel from '../JobDetailPanel';
import { MANUAL_SOURCE_ID, type JobPosting } from '../types';

interface JobDetailPageProps {
  id: string;
  targetId: string | undefined;
}

export default function JobDetailPage({ id, targetId }: JobDetailPageProps) {
  const [posting, setPosting] = useState<JobPosting | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`/api/jobs/${id}`);
        if (res.status === 404) {
          if (!cancelled) setNotFound(true);
          return;
        }
        if (!res.ok) throw new Error('Failed to load job');
        const data = (await res.json()) as JobPosting;
        if (!cancelled) setPosting(data);
      } catch {
        if (!cancelled)
          toast({ variant: 'error', title: 'Failed to load job' });
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [id, toast]);

  const handleDelete = useCallback(() => {
    router.push('/fitted/jobs');
  }, [router]);

  const handleStatusChange = useCallback((newStatus: string) => {
    setPosting(prev => (prev ? { ...prev, status: newStatus } : prev));
  }, []);

  if (loading) {
    return (
      <div className='flex flex-col gap-6'>
        <div className='flex items-center gap-3'>
          <Skeleton variant='rectangular' width={32} height={32} />
          <Skeleton width={240} size='lg' />
        </div>
        <Card>
          <CardContent className='flex flex-col gap-3 p-6'>
            <Skeleton variant='text' lines={4} />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (notFound || !posting) {
    return (
      <div className='flex flex-col gap-6'>
        <div className='flex items-center gap-3'>
          <Link
            href='/fitted/jobs'
            className='p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-tertiary transition-colors'
            aria-label='Back to jobs'
          >
            <ArrowLeft className='size-5' aria-hidden />
          </Link>
          <Heading variant='hero' as='h1'>
            Job not found
          </Heading>
        </div>
        <Card>
          <CardContent className='py-12 text-center'>
            <Text variant='body'>
              This job may have been deleted or the link is incorrect.
            </Text>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isManual = posting.source_id === MANUAL_SOURCE_ID;

  return (
    <div className='flex flex-col gap-6'>
      <div className='flex items-start gap-3'>
        <Link
          href='/fitted/jobs'
          className='mt-1 p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-tertiary transition-colors'
          aria-label='Back to jobs'
        >
          <ArrowLeft className='size-5' aria-hidden />
        </Link>
        <div className='flex-1 min-w-0'>
          <div className='flex flex-wrap items-center gap-2'>
            <Heading variant='component' as='h1' className='wrap-break-word'>
              {posting.title}
            </Heading>
            {isManual && (
              <Badge variant='default' size='sm'>
                Manual
              </Badge>
            )}
          </div>
          <Text variant='caption' className='mt-1 text-text-secondary'>
            {posting.company_name}
            {posting.location ? ` · ${posting.location}` : ''}
          </Text>
          {posting.absolute_url && (
            <a
              href={posting.absolute_url}
              target='_blank'
              rel='noopener noreferrer'
              className='mt-2 inline-flex items-center gap-1.5 text-sm text-brand-500 hover:underline'
            >
              <ExternalLink className='size-4' aria-hidden />
              View original posting
            </a>
          )}
        </div>
      </div>

      <Card padding='none'>
        <JobDetailPanel
          posting={posting}
          targetId={targetId}
          onDelete={handleDelete}
          onStatusChange={handleStatusChange}
        />
      </Card>
    </div>
  );
}
