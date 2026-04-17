'use client';

import { useState } from 'react';
import { Badge } from '@danieljoffe.com/shared-ui/Badge';
import { Text } from '@danieljoffe.com/shared-ui/Text';
import Button from '@/components/Button';
import { useToast } from '@/state/Toast/ToastProvider';
import { JOB_STATUSES, type JobPosting } from './types';

interface JobDetailProps {
  posting: Pick<
    JobPosting,
    | 'id'
    | 'title'
    | 'company_name'
    | 'absolute_url'
    | 'score'
    | 'score_breakdown'
    | 'status'
  >;
  onDelete: (() => void) | undefined;
}

export default function JobDetail({ posting, onDelete }: JobDetailProps) {
  const [status, setStatus] = useState(posting.status);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();

  async function updateStatus(newStatus: string) {
    setUpdating(true);
    try {
      const res = await fetch(`/api/jobs/${posting.id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) setStatus(newStatus);
    } finally {
      setUpdating(false);
    }
  }

  async function handleDelete() {
    /* eslint-disable no-alert -- admin-only tool, native confirm is sufficient */
    if (
      !window.confirm(`Delete "${posting.title}" from ${posting.company_name}?`)
    )
      /* eslint-enable no-alert */
      return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/jobs/${posting.id}`, { method: 'DELETE' });
      if (res.ok) {
        toast({ variant: 'success', title: 'Job deleted' });
        onDelete?.();
      } else {
        toast({ variant: 'error', title: 'Failed to delete job' });
      }
    } catch {
      toast({ variant: 'error', title: 'Failed to delete job' });
    } finally {
      setDeleting(false);
    }
  }

  const breakdown = posting.score_breakdown;

  return (
    <div className='border-t border-border bg-surface-tertiary p-4 space-y-4'>
      <div className='flex flex-wrap gap-4'>
        <div>
          <Text variant='caption' className='mb-1'>
            Score Breakdown
          </Text>
          {breakdown ? (
            <div className='flex flex-wrap gap-2'>
              {Object.entries(breakdown).map(([key, value]) => (
                <Badge
                  key={key}
                  variant={value > 0 ? 'info' : value < 0 ? 'error' : 'default'}
                  size='sm'
                >
                  {key}: {value}
                </Badge>
              ))}
            </div>
          ) : (
            <Text variant='meta'>No breakdown available</Text>
          )}
        </div>
        <div>
          <Text variant='caption' className='mb-1'>
            Status
          </Text>
          <div className='flex gap-2'>
            {JOB_STATUSES.map(s => (
              <Button
                key={s}
                name={`status-${s}`}
                variant={status === s ? 'primary' : 'outline'}
                size='sm'
                disabled={updating || status === s}
                onClick={() => updateStatus(s)}
              >
                {s}
              </Button>
            ))}
          </div>
        </div>
      </div>
      <div className='flex gap-2'>
        {posting.absolute_url && (
          <Button
            as='link'
            href={posting.absolute_url}
            target='_blank'
            rel='noopener noreferrer'
            variant='secondary'
            size='sm'
            name='view-posting'
          >
            View on Greenhouse
          </Button>
        )}
        <Button
          name='delete-posting'
          variant='error'
          size='sm'
          onClick={handleDelete}
          disabled={deleting}
        >
          {deleting ? 'Deleting...' : 'Delete'}
        </Button>
      </div>
    </div>
  );
}
