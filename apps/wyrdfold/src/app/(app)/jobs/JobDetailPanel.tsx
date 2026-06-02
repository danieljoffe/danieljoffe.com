'use client';

import { useCallback, useEffect, useState } from 'react';
import { ChevronDown, Maximize2, MoreVertical } from 'lucide-react';
import { Badge } from '@danieljoffe.com/shared-ui/Badge';
import { Dropdown } from '@danieljoffe.com/shared-ui/Dropdown';
import type { DropdownItem } from '@danieljoffe.com/shared-ui/Dropdown';
import { Skeleton } from '@danieljoffe.com/shared-ui/Skeleton';
import { Spinner } from '@danieljoffe.com/shared-ui/Spinner';
import { Text } from '@danieljoffe.com/shared-ui/Text';
import Button from '@/components/Button';
import { cn } from '@/lib/cn';
import { extractApiError } from '@/lib/extractApiError';
import { useToast } from '@/state/Toast/ToastProvider';
import CoverLetterSection from './CoverLetterSection';
import JobFeedbackSection from './JobFeedbackSection';
import ResumeSection from './ResumeSection';
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
  /** Fired after the LLM analysis completes. The blend write-back
   *  (PR #689 / #690 / #691) updates the per-target score + flips
   *  ``scoring_status`` to ``complete``, but the panel's ``posting``
   *  prop is still stale until the parent refetches. Pages that own
   *  ``posting`` state should re-GET ``/api/jobs/{id}`` here so the
   *  Score badge + breakdown reflect the new blended values without
   *  the user having to manually refresh. */
  onAnalysisComplete?: (() => void) | undefined;
  /** Suppress the panel's own Delete action (the page renders one at root). */
  hideDelete?: boolean;
  /** Default-open the JD description block on the full-page detail
   *  view (where the user clearly wants to see it). The inline panel
   *  in the list keeps it collapsed to avoid blowing up rows. */
  defaultDescriptionOpen?: boolean;
}

const SCORE_FACTOR_LABEL: Record<string, string> = {
  role_titles: 'Role titles',
  technologies: 'Technologies',
  domain_skills: 'Domain skills',
  seniority_signals: 'Seniority signals',
  negative: 'Penalties',
};

function formatFactor(key: string): string {
  return SCORE_FACTOR_LABEL[key] ?? key.replace(/_/g, ' ');
}

function ScoreBreakdownList({
  breakdown,
}: {
  breakdown: Record<string, number>;
}) {
  const entries = Object.entries(breakdown).filter(([, v]) => v !== 0);
  if (entries.length === 0) {
    return <Text variant='meta'>No factors contributed to this score</Text>;
  }
  const max = Math.max(...entries.map(([, v]) => Math.abs(v)));
  return (
    <ul className='flex flex-col gap-2'>
      {entries.map(([key, value]) => {
        const pct = max === 0 ? 0 : (Math.abs(value) / max) * 100;
        const positive = value > 0;
        const display = Number.isInteger(value)
          ? value
          : Number(value.toFixed(1));
        return (
          <li key={key} className='flex flex-col gap-1'>
            <div className='flex items-baseline justify-between gap-3'>
              <span className='text-sm text-text-primary'>
                {formatFactor(key)}
              </span>
              <span
                className={cn(
                  'text-xs font-medium tabular-nums shrink-0',
                  positive ? 'text-success' : 'text-error'
                )}
              >
                {positive ? '+' : ''}
                {display}
              </span>
            </div>
            <div className='h-1.5 w-full overflow-hidden rounded-full bg-surface-elevated'>
              <div
                className={cn(
                  'h-full rounded-full',
                  positive ? 'bg-success' : 'bg-error/70'
                )}
                style={{ width: `${pct}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export default function JobDetailPanel({
  posting,
  targetId,
  viewFullHref,
  onDelete,
  onStatusChange,
  onAnalysisComplete,
  hideDelete = false,
  defaultDescriptionOpen = false,
}: JobDetailPanelProps) {
  const [status, setStatus] = useState(posting.status);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [analysis, setAnalysis] = useState<JobAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzingStartedAt, setAnalyzingStartedAt] = useState<number | null>(
    null
  );
  const [analyzingElapsedS, setAnalyzingElapsedS] = useState(0);
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
        toast({
          variant: 'error',
          title: await extractApiError(res, 'Failed to update status'),
        });
      }
    } catch {
      toast({ variant: 'error', title: 'Network error updating status' });
    } finally {
      setUpdating(false);
    }
  }

  // Tick the elapsed-seconds counter while an analysis is in flight. LLM
  // calls take 20–30s; without a moving number next to the section caption
  // the user has no signal between "click" and "result" and the panel
  // appears hung. The skeleton placeholder below the caption uses the same
  // ``bg-surface-tertiary`` as the panel surface, so it was invisible —
  // surfacing the indicator next to the caption guarantees something
  // moves regardless of the body fill.
  useEffect(() => {
    if (!analyzing || analyzingStartedAt === null) {
      setAnalyzingElapsedS(0);
      return;
    }
    const tick = () =>
      setAnalyzingElapsedS(
        Math.floor((Date.now() - analyzingStartedAt) / 1000)
      );
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [analyzing, analyzingStartedAt]);

  const runAnalysis = useCallback(async () => {
    if (!targetId) return;
    setAnalyzing(true);
    setAnalyzingStartedAt(Date.now());
    setAnalysisError(null);
    try {
      const res = await fetch(
        `/api/jobs/analysis/${posting.id}?target_id=${encodeURIComponent(targetId)}`,
        { method: 'POST' }
      );
      if (res.ok) {
        const data = (await res.json()) as JobAnalysis;
        setAnalysis(data);
        // Backend blended the LLM score into the per-target ``scores``
        // row + flipped ``scoring_status`` to ``complete``. The
        // ``posting`` prop is now stale (still shows the keyword-only
        // score). Notify the parent so it can refetch and re-render
        // the Score badge + breakdown without a manual page refresh.
        onAnalysisComplete?.();
      } else {
        // Distinguish the specific "no description in DB" 422 case (the
        // route surfaces ``Job posting has no description to analyze.``)
        // from every other failure mode (404, 503, LLM error, network
        // reset). Everything else routes through ``extractApiError``,
        // which understands both string ``detail`` and the structured
        // ``llm_budget_exceeded`` 429 — the latter previously fell
        // through to a generic "Analysis failed (429)" with no recovery
        // hint.
        const message = await extractApiError(res, 'Analysis failed');
        if (res.status === 422 && /no description/i.test(message)) {
          setAnalysisError(
            'Analysis skipped — this job posting has no description text.'
          );
        } else {
          setAnalysisError(message);
        }
      }
    } catch {
      setAnalysisError('Network error running analysis.');
    } finally {
      setAnalyzing(false);
      setAnalyzingStartedAt(null);
    }
  }, [posting.id, targetId, onAnalysisComplete]);

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
        toast({
          variant: 'error',
          title: await extractApiError(res, 'Failed to delete job'),
        });
      }
    } catch {
      toast({ variant: 'error', title: 'Network error deleting job' });
    } finally {
      setDeleting(false);
    }
  }

  const breakdown = posting.score_breakdown;

  // Sanitize the upstream JD HTML once per posting. Greenhouse returns
  // (and the poller persists) the description body entity-encoded —
  // ``&lt;h4&gt;…&lt;/h4&gt;`` rather than ``<h4>…</h4>`` — so we have
  // to decode one level before DOMPurify will recognize the tags;
  // otherwise the panel just renders the encoded source as text.
  // DOMPurify itself scrubs against XSS — defence-in-depth even
  // though the source is first-party.
  //
  // ``description_html`` is only populated on the /jobs/{id} detail
  // response — the /jobs list omits it. Dynamic-import keeps the
  // ~35 KB isomorphic-dompurify dep off the list-page bundle.
  const [sanitizedDescription, setSanitizedDescription] = useState<
    string | null
  >(null);
  useEffect(() => {
    const raw = posting.description_html ?? '';
    if (!raw.trim()) {
      setSanitizedDescription(null);
      return;
    }
    let cancelled = false;
    void import('isomorphic-dompurify').then(mod => {
      if (cancelled) return;
      const ta = document.createElement('textarea');
      ta.innerHTML = raw;
      setSanitizedDescription(
        mod.default.sanitize(ta.value, { USE_PROFILES: { html: true } })
      );
    });
    return () => {
      cancelled = true;
    };
  }, [posting.description_html]);

  return (
    <div className='border-t border-border bg-surface-tertiary p-4 space-y-6'>
      {/* Single header toolbar:
            [status] | [score] | [resume] | [cover letter] | [open ↗] | [⋯]
          Tailor actions live in the toolbar rather than a separate row so the
          panel reads top-down as one strip of decisions plus the analysis
          body, instead of six labeled stacks. */}
      <div className='flex flex-wrap items-center gap-2 md:flex-nowrap md:gap-3'>
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
        <Badge
          variant={
            posting.score >= 70
              ? 'success'
              : posting.score >= 40
                ? 'warning'
                : 'error'
          }
          size='sm'
          aria-label={`Match score ${posting.score}`}
        >
          {posting.score}
        </Badge>

        {/* Resume + Cover Letter as compact pills in the toolbar. Only when
            a target is selected — tailoring requires one. The components
            keep all their generate/review/view state internally; passing
            ``compact`` switches them to a single-button render. */}
        {targetId && (
          <>
            <ResumeSection jobPostingId={posting.id} compact />
            <CoverLetterSection
              jobPostingId={posting.id}
              companyName={posting.company_name}
              roleTitle={posting.title}
              compact
            />
          </>
        )}

        {/* The remaining icons push to the right of the toolbar. ``ml-auto``
            on the first right-aligned item lets the flex row wrap naturally
            on narrow viewports without splitting Status/Score from the
            tailor buttons. */}
        {viewFullHref && (
          <Button
            as='link'
            href={viewFullHref}
            variant='ghost'
            size='sm'
            name='view-full-job'
            aria-label='Open full view'
            className='ml-auto'
          >
            <Maximize2 className='size-4' aria-hidden />
          </Button>
        )}
        {!hideDelete && (
          <Dropdown
            trigger={
              <span
                className={cn(
                  'inline-flex size-8 items-center justify-center rounded-md text-text-secondary hover:bg-surface-elevated hover:text-text-primary',
                  !viewFullHref && 'ml-auto'
                )}
                aria-label='More actions'
              >
                <MoreVertical className='size-4' aria-hidden />
              </span>
            }
            items={[
              {
                label: deleting ? 'Deleting…' : 'Delete',
                danger: true,
                disabled: deleting,
                onClick: handleDelete,
              },
            ]}
          />
        )}
      </div>

      {/* Two-column main body: Score Breakdown on the left, LLM Analysis on
          the right. The previous stacked-section layout forced the eye down
          the page through six labeled blocks; pairing the two scoring panels
          keeps both visible without scrolling and reads as "here's why we
          score it, here's what the model thinks". */}
      <div className='grid grid-cols-1 gap-6 md:grid-cols-2'>
        {/* Score breakdown */}
        <div>
          <Text variant='caption' className='mb-2'>
            Score Breakdown
          </Text>
          {breakdown ? (
            <ScoreBreakdownList breakdown={breakdown} />
          ) : (
            <Skeleton variant='text' lines={3} />
          )}
        </div>

        {/* LLM Analysis — only when a target is selected. The "pick a
            target" hint lives at the list level so it shows once, not per
            row. Rendered inline here as the right column of the body grid;
            the standalone section it occupied before is gone. */}
        {targetId && (
          <div>
            <div className='mb-1 flex items-center gap-2'>
              <Text variant='caption'>LLM Analysis</Text>
              {analyzing && (
                <span
                  className='inline-flex items-center gap-1.5'
                  role='status'
                  aria-live='polite'
                >
                  <Spinner size='sm' aria-label='Running LLM analysis' />
                  <Text variant='meta'>Running… {analyzingElapsedS}s</Text>
                </span>
              )}
            </div>
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
              // Inline placeholder bars rather than ``<Skeleton>``: the
              // shared component's ``bg-surface-tertiary`` fill matches the
              // panel's ``bg-surface-tertiary`` surface exactly, so the
              // pulse rendered against its own colour and was invisible.
              // ``bg-surface-elevated`` lifts above the panel surface
              // (white in light, off-black in dark) for a real placeholder
              // that pulses visibly against the tertiary backdrop.
              <div className='space-y-2'>
                <div className='h-4 rounded-xs bg-surface-elevated animate-pulse motion-reduce:animate-none' />
                <div className='h-4 rounded-xs bg-surface-elevated animate-pulse motion-reduce:animate-none' />
                <div className='h-4 w-3/4 rounded-xs bg-surface-elevated animate-pulse motion-reduce:animate-none' />
              </div>
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
      </div>

      {/* Job description body — rendered from the upstream JD HTML.
          Wrapped in ``<details>`` so the inline list panel stays compact;
          the full detail page passes ``defaultDescriptionOpen`` to open
          it by default since the user navigated there explicitly. */}
      {sanitizedDescription && (
        <details open={defaultDescriptionOpen}>
          <summary className='cursor-pointer text-text-secondary hover:text-text-primary'>
            <Text variant='caption' as='span'>
              Job description
            </Text>
          </summary>
          <div
            className='mt-2 prose prose-sm dark:prose-invert max-w-none text-text-primary [&_a]:text-brand-500 [&_a]:underline [&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-5 [&_ol]:pl-5'
            // Sanitized via DOMPurify above — safe to inject.
            dangerouslySetInnerHTML={{ __html: sanitizedDescription }}
          />
        </details>
      )}

      {/* Relevance feedback — only shown when viewing under a specific
          target, since the signal is target-scoped. */}
      {targetId && (
        <JobFeedbackSection jobId={posting.id} targetId={targetId} />
      )}

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
    </div>
  );
}
