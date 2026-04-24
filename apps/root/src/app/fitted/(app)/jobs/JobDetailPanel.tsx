'use client';

import { useState } from 'react';
import { Badge } from '@danieljoffe.com/shared-ui/Badge';
import { Skeleton } from '@danieljoffe.com/shared-ui/Skeleton';
import { Text } from '@danieljoffe.com/shared-ui/Text';
import Button from '@/components/Button';
import { useToast } from '@/state/Toast/ToastProvider';
import { JOB_STATUSES, type JobAnalysis, type JobPosting } from './types';

interface JobDetailPanelProps {
  posting: JobPosting;
  onDelete: (() => void) | undefined;
  onStatusChange: ((status: string) => void) | undefined;
}

export default function JobDetailPanel({
  posting,
  onDelete,
  onStatusChange,
}: JobDetailPanelProps) {
  const [status, setStatus] = useState(posting.status);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [analysis, setAnalysis] = useState<JobAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const { toast } = useToast();

  async function updateStatus(newStatus: string) {
    setUpdating(true);
    try {
      const res = await fetch(`/api/jobs/${posting.id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setStatus(newStatus);
        onStatusChange?.(newStatus);
      } else {
        toast({ variant: 'error', title: 'Failed to update status' });
      }
    } catch {
      toast({ variant: 'error', title: 'Failed to update status' });
    } finally {
      setUpdating(false);
    }
  }

  async function handleAnalyze() {
    setAnalyzing(true);
    setAnalysisError(null);
    try {
      const res = await fetch(`/api/jobs/analysis/${posting.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_description: '' }),
      });
      if (res.ok) {
        const data = (await res.json()) as JobAnalysis;
        setAnalysis(data);
      } else {
        setAnalysisError('Analysis failed. The job may lack a description.');
      }
    } catch {
      setAnalysisError('Network error running analysis.');
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleDelete() {
    /* eslint-disable no-alert -- personal tool, native confirm is fine */
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
      {/* Score breakdown */}
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

      {/* Status buttons */}
      <div>
        <Text variant='caption' className='mb-1'>
          Status
        </Text>
        <div className='flex flex-wrap gap-2'>
          {JOB_STATUSES.map(s => (
            <Button
              key={s}
              name={`status-${s}`}
              variant={status === s ? 'primary' : 'outline'}
              size='sm'
              disabled={updating || status === s}
              onClick={() => updateStatus(s)}
            >
              {s.replace('_', ' ')}
            </Button>
          ))}
        </div>
      </div>

      {/* LLM Analysis */}
      <div>
        <Text variant='caption' className='mb-1'>
          LLM Analysis
        </Text>
        {analysis ? (
          <div className='space-y-2'>
            <Text variant='body'>{analysis.recommendation}</Text>
            <div className='flex flex-wrap gap-2'>
              <Badge
                variant={
                  analysis.scorecard.seniority_fit === 'strong'
                    ? 'success'
                    : analysis.scorecard.seniority_fit === 'moderate'
                      ? 'warning'
                      : 'error'
                }
                size='sm'
              >
                Seniority: {analysis.scorecard.seniority_fit}
              </Badge>
              <Badge
                variant={
                  analysis.scorecard.domain_fit === 'strong'
                    ? 'success'
                    : analysis.scorecard.domain_fit === 'moderate'
                      ? 'warning'
                      : 'error'
                }
                size='sm'
              >
                Domain: {analysis.scorecard.domain_fit}
              </Badge>
            </div>
            {analysis.scorecard.skills_missing.length > 0 && (
              <div>
                <Text variant='meta' className='mb-1'>
                  Missing skills
                </Text>
                <div className='flex flex-wrap gap-1'>
                  {analysis.scorecard.skills_missing.map(skill => (
                    <Badge key={skill} variant='error' size='sm'>
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : analyzing ? (
          <Skeleton variant='text' lines={3} />
        ) : (
          <div>
            {analysisError && (
              <Text variant='error' className='mb-2'>
                {analysisError}
              </Text>
            )}
            <Button
              name='analyze-job'
              variant='secondary'
              size='sm'
              onClick={handleAnalyze}
            >
              Analyze
            </Button>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className='flex gap-2'>
        {posting.absolute_url && (
          <Button
            as='link'
            href={posting.absolute_url}
            target='_blank'
            rel='noopener noreferrer'
            variant='secondary'
            size='sm'
            name='view-posting-url'
          >
            View posting
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
