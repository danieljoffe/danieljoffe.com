'use client';

import { useState } from 'react';
import { Badge } from '@danieljoffe.com/shared-ui/Badge';
import { Text } from '@danieljoffe.com/shared-ui/Text';
import Button from '@/components/Button';

interface JobDetailProps {
  posting: {
    id: string;
    title: string;
    company_name: string;
    absolute_url: string | null;
    score: number;
    score_breakdown: Record<string, number> | null;
    status: string;
  };
  password: string;
}

const STATUS_OPTIONS = [
  'new',
  'saved',
  'applied',
  'rejected',
  'archived',
] as const;

export default function JobDetail({ posting, password }: JobDetailProps) {
  const [status, setStatus] = useState(posting.status);
  const [updating, setUpdating] = useState(false);

  async function updateStatus(newStatus: string) {
    setUpdating(true);
    try {
      const res = await fetch(`/api/jobs/${posting.id}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': password,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) setStatus(newStatus);
    } finally {
      setUpdating(false);
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
            {STATUS_OPTIONS.map(s => (
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
    </div>
  );
}
