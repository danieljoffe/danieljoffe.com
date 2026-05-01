'use client';

import { useCallback, useEffect, useState } from 'react';
import { ChevronDown, Maximize2 } from 'lucide-react';
import { Badge } from '@danieljoffe.com/shared-ui/Badge';
import { Dropdown } from '@danieljoffe.com/shared-ui/Dropdown';
import type { DropdownItem } from '@danieljoffe.com/shared-ui/Dropdown';
import { Skeleton } from '@danieljoffe.com/shared-ui/Skeleton';
import { Text } from '@danieljoffe.com/shared-ui/Text';
import Button from '@/components/Button';
import { cn } from '@/lib/cn';
import { useToast } from '@/state/Toast/ToastProvider';
import CoverLetterSection from './CoverLetterSection';
import StatusIndicator from './StatusIndicator';
import {
  formatStatus,
  JOB_STATUSES,
  STATUS_DOT_CLASS,
  type JobAnalysis,
  type JobPosting,
  type JobStatus,
  type StatusLogEntry,
} from './types';

interface JobDetailPanelProps {
  posting: JobPosting;
  targetId: string | undefined;
  viewFullHref: string | undefined;
  onDelete: (() => void) | undefined;
  onStatusChange: ((status: string) => void) | undefined;
}

export default function JobDetailPanel({
  posting,
  targetId,
  viewFullHref,
  onDelete,
  onStatusChange,
}: JobDetailPanelProps) {
  const [status, setStatus] = useState(posting.status);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [analysis, setAnalysis] = useState<JobAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [history, setHistory] = useState<StatusLogEntry[]>([]);
  const { toast } = useToast();

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch(`/api/jobs/${posting.id}/status-history`);
      if (res.ok) {
        const data = (await res.json()) as { entries: StatusLogEntry[] };
        setHistory(data.entries);
      }
    } catch {
      // Non-critical — don't toast on history fetch failure
    }
  }, [posting.id]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

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
        fetchHistory();
      } else {
        toast({ variant: 'error', title: 'Failed to update status' });
      }
    } catch {
      toast({ variant: 'error', title: 'Failed to update status' });
    } finally {
      setUpdating(false);
    }
  }

  const runAnalysis = useCallback(async () => {
    if (!targetId) return;
    setAnalyzing(true);
    setAnalysisError(null);
    try {
      const res = await fetch(
        `/api/jobs/analysis/${posting.id}?target_id=${encodeURIComponent(targetId)}`,
        { method: 'POST' }
      );
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
  }, [posting.id, targetId]);

  // Auto-trigger analysis on first open when a target is selected.
  // Cache hit returns instantly; cache miss runs the LLM exactly once
  // per (job, target, optimized version).
  useEffect(() => {
    if (targetId && !analysis && !analyzing && !analysisError) {
      runAnalysis();
    }
  }, [targetId, analysis, analyzing, analysisError, runAnalysis]);

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

      {/* Status dropdown */}
      <div>
        <Text variant='caption' className='mb-1'>
          Status
        </Text>
        <Dropdown
          trigger={
            <span
              className={cn(
                'inline-flex items-center gap-2 rounded-md border border-border bg-surface-elevated px-3 py-1.5 text-sm transition-colors',
                updating
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:bg-surface-tertiary'
              )}
              aria-disabled={updating || undefined}
            >
              <span
                className={cn(
                  'inline-block size-2 rounded-full',
                  STATUS_DOT_CLASS[status as JobStatus] ?? 'bg-text-tertiary'
                )}
                aria-hidden
              />
              <span className='capitalize'>{formatStatus(status)}</span>
              <ChevronDown className='size-4 text-text-tertiary' aria-hidden />
            </span>
          }
          items={JOB_STATUSES.map<DropdownItem>(s => ({
            label: formatStatus(s),
            icon: (
              <span
                className={cn(
                  'inline-block size-2 rounded-full',
                  STATUS_DOT_CLASS[s]
                )}
                aria-hidden
              />
            ),
            disabled: updating || status === s,
            onClick: () => updateStatus(s),
          }))}
        />
      </div>

      {/* Status History */}
      {history.length > 0 && (
        <div>
          <Text variant='caption' className='mb-1'>
            History
          </Text>
          <div className='flex flex-col gap-1'>
            {history.slice(0, 5).map(entry => (
              <div
                key={entry.id}
                className='flex items-center gap-2 text-xs text-text-secondary'
              >
                <span className='shrink-0'>
                  {new Date(entry.created_at).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </span>
                <span>&rarr;</span>
                <StatusIndicator status={entry.new_status} />
                {entry.note && (
                  <span className='truncate italic'>{entry.note}</span>
                )}
              </div>
            ))}
            {history.length > 5 && (
              <Text variant='meta' className='text-text-tertiary'>
                +{history.length - 5} more
              </Text>
            )}
          </div>
        </div>
      )}

      {/* LLM Analysis — only when a target is selected. The "pick a target"
          hint lives at the list level so it shows once, not per-row. */}
      {targetId && (
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
                onClick={runAnalysis}
              >
                Retry analysis
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Resume lifecycle */}
      {(status === 'resume_draft' || status === 'resume_ready') && (
        <div>
          <Text variant='caption' className='mb-1'>
            Resume
          </Text>
          {status === 'resume_draft' && (
            <Button
              as='link'
              href={`/fitted/jobs/${posting.id}/resume`}
              variant='primary'
              size='sm'
              name='review-resume'
            >
              Review Resume
            </Button>
          )}
          {status === 'resume_ready' && (
            <div className='flex items-center gap-2'>
              <Badge variant='success' size='sm'>
                Approved
              </Badge>
              <Button
                as='link'
                href={`/fitted/jobs/${posting.id}/resume`}
                variant='secondary'
                size='sm'
                name='view-approved-resume'
              >
                View / Download
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Cover letter */}
      {(status === 'resume_draft' || status === 'resume_ready') && (
        <CoverLetterSection
          jobPostingId={posting.id}
          companyName={posting.company_name}
          roleTitle={posting.title}
        />
      )}

      {/* Actions */}
      <div className='flex flex-wrap gap-2'>
        {viewFullHref && (
          <Button
            as='link'
            href={viewFullHref}
            variant='secondary'
            size='sm'
            name='view-full-job'
          >
            <Maximize2 className='size-4' aria-hidden />
            Open full view
          </Button>
        )}
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
