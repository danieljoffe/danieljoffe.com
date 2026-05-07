'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Download, Lock, RotateCcw, Unlock } from 'lucide-react';
import { Badge } from '@danieljoffe.com/shared-ui/Badge';
import { Heading } from '@danieljoffe.com/shared-ui/Heading';
import { Skeleton } from '@danieljoffe.com/shared-ui/Skeleton';
import { Text } from '@danieljoffe.com/shared-ui/Text';
import Button from '@/components/Button';
import { useToast } from '@/state/Toast/ToastProvider';
import type {
  JobPosting,
  LintViolation,
  ResumeVersion,
  ResumeVersionsResponse,
  TailoredResumeRecord,
  TailorResponse,
} from '../../types';

interface ResumeReviewPageProps {
  jobPostingId: string;
}

const AUTOSAVE_DEBOUNCE_MS = 1500;

type SaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error';

function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .normalize('NFKD')
      .replace(/\p{Diacritic}/gu, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'resume'
  );
}

export default function ResumeReviewPage({
  jobPostingId,
}: ResumeReviewPageProps) {
  const { toast } = useToast();

  const [posting, setPosting] = useState<JobPosting | null>(null);
  const [record, setRecord] = useState<TailoredResumeRecord | null>(null);
  const [markdown, setMarkdown] = useState('');
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [approving, setApproving] = useState(false);
  const [unapproving, setUnapproving] = useState(false);
  const [readapting, setReadapting] = useState(false);
  const [lintWarnings, setLintWarnings] = useState<LintViolation[]>([]);

  const [versions, setVersions] = useState<ResumeVersion[] | null>(null);
  const [versionCap, setVersionCap] = useState<number>(5);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [versionsOpen, setVersionsOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [jobRes, resumeRes] = await Promise.all([
        fetch(`/api/jobs/${jobPostingId}`),
        fetch(`/api/jobs/tailor/by-job/${jobPostingId}`),
      ]);
      if (jobRes.status === 404 || resumeRes.status === 404) {
        setNotFound(true);
        return;
      }
      if (!jobRes.ok || !resumeRes.ok) {
        toast({ variant: 'error', title: 'Failed to load resume' });
        return;
      }
      const job = (await jobRes.json()) as JobPosting;
      const resume = (await resumeRes.json()) as TailoredResumeRecord;
      setPosting(job);
      setRecord(resume);
      setMarkdown(resume.payload_md ?? '');
      setSaveStatus('idle');
    } catch {
      toast({ variant: 'error', title: 'Network error loading resume' });
    } finally {
      setLoading(false);
    }
  }, [jobPostingId, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const loadVersions = useCallback(async () => {
    if (!record) return;
    setVersionsLoading(true);
    try {
      const res = await fetch(`/api/jobs/tailor/${record.id}/versions`);
      if (!res.ok) {
        toast({ variant: 'error', title: 'Failed to load version history' });
        return;
      }
      const data = (await res.json()) as ResumeVersionsResponse;
      setVersions(data.versions);
      setVersionCap(data.cap);
    } catch {
      toast({ variant: 'error', title: 'Network error loading versions' });
    } finally {
      setVersionsLoading(false);
    }
  }, [record, toast]);

  function toggleVersions() {
    const next = !versionsOpen;
    setVersionsOpen(next);
    if (next && versions === null) loadVersions();
  }

  const inflightRef = useRef(false);
  const persistMarkdown = useCallback(async (): Promise<boolean> => {
    if (!record) return false;
    // Single-flight: a slow PATCH overlapping the next debounce tick would
    // race to overwrite the row. Skip; the next keystroke or explicit
    // flushPendingSave will retry.
    if (inflightRef.current) return false;
    inflightRef.current = true;
    const sentMarkdown = markdown;
    setSaveStatus('saving');
    setLintWarnings([]);
    try {
      const res = await fetch(`/api/jobs/tailor/${record.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markdown: sentMarkdown }),
      });
      if (res.status === 422) {
        const err = await res.json();
        toast({ variant: 'error', title: 'Resume failed ATS lint' });
        if (err.detail?.violations) {
          setLintWarnings(err.detail.violations as LintViolation[]);
        }
        setSaveStatus('error');
        return false;
      }
      if (!res.ok) {
        toast({ variant: 'error', title: 'Failed to save changes' });
        setSaveStatus('error');
        return false;
      }
      const data = (await res.json()) as TailorResponse;
      setRecord(data.record);
      setLintWarnings(data.lint_warnings);
      // Only adopt server-normalized markdown if the user hasn't typed
      // since we sent — otherwise their in-flight edits would be lost.
      setMarkdown(curr =>
        curr === sentMarkdown ? (data.record.payload_md ?? curr) : curr
      );
      // Likewise, only flip to 'saved' if no new edit pushed us back to
      // 'pending' during the in-flight fetch.
      setSaveStatus(prev => (prev === 'saving' ? 'saved' : prev));
      return true;
    } catch {
      toast({ variant: 'error', title: 'Network error saving draft' });
      setSaveStatus('error');
      return false;
    } finally {
      inflightRef.current = false;
    }
  }, [record, markdown, toast]);

  // Debounced auto-save: every keystroke moves saveStatus to 'pending';
  // 1.5s of quiet then flushes a PATCH.
  useEffect(() => {
    if (saveStatus !== 'pending') return;
    const timer = setTimeout(() => {
      persistMarkdown();
    }, AUTOSAVE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [markdown, saveStatus, persistMarkdown]);

  // Session-end checkpoint: snapshot the current markdown into version
  // history when the user navigates away. Uses sendBeacon so the browser
  // delivers the request even after the tab is gone. Server-side dedup
  // keeps the 5-version cap from being eaten by no-op closes.
  const sessionStateRef = useRef({
    saveStatus,
    markdown,
    recordId: record?.id ?? null,
  });
  useEffect(() => {
    sessionStateRef.current = {
      saveStatus,
      markdown,
      recordId: record?.id ?? null,
    };
  });
  useEffect(() => {
    const flush = () => {
      const {
        saveStatus: status,
        markdown: md,
        recordId,
      } = sessionStateRef.current;
      if (!recordId || status === 'idle') return;
      const url = `/api/jobs/tailor/${recordId}/checkpoint`;
      const carryUnsaved = status === 'pending' || status === 'error';
      const payload = carryUnsaved ? JSON.stringify({ markdown: md }) : '{}';
      navigator.sendBeacon(
        url,
        new Blob([payload], { type: 'application/json' })
      );
    };
    window.addEventListener('pagehide', flush);
    return () => window.removeEventListener('pagehide', flush);
  }, []);

  const flushPendingSave = useCallback(async (): Promise<boolean> => {
    if (saveStatus === 'pending' || saveStatus === 'saving') {
      return persistMarkdown();
    }
    return saveStatus !== 'error';
  }, [saveStatus, persistMarkdown]);

  const recordCheckpoint = useCallback(async (): Promise<void> => {
    if (!record) return;
    try {
      await fetch(`/api/jobs/tailor/${record.id}/checkpoint`, {
        method: 'POST',
      });
    } catch {
      // Checkpoint is best-effort — don't block approve/readapt on it.
    }
  }, [record]);

  async function handleApprove() {
    if (!record) return;
    setApproving(true);
    try {
      const ok = await flushPendingSave();
      if (!ok) {
        setApproving(false);
        return;
      }
      // Snapshot the about-to-be-locked draft into version history.
      await recordCheckpoint();
      const res = await fetch(`/api/jobs/tailor/${record.id}/approve`, {
        method: 'POST',
      });
      if (!res.ok) {
        toast({ variant: 'error', title: 'Failed to approve resume' });
        return;
      }
      const approved = (await res.json()) as TailoredResumeRecord;
      setRecord(approved);
      toast({ variant: 'success', title: 'Resume locked' });
    } catch {
      toast({ variant: 'error', title: 'Network error locking resume' });
    } finally {
      setApproving(false);
    }
  }

  async function handleUnapprove() {
    if (!record) return;
    setUnapproving(true);
    try {
      const res = await fetch(`/api/jobs/tailor/${record.id}/unapprove`, {
        method: 'POST',
      });
      if (!res.ok) {
        toast({ variant: 'error', title: 'Failed to unlock resume' });
        return;
      }
      const reopened = (await res.json()) as TailoredResumeRecord;
      setRecord(reopened);
      toast({ variant: 'success', title: 'Resume unlocked for editing' });
    } catch {
      toast({ variant: 'error', title: 'Network error unlocking resume' });
    } finally {
      setUnapproving(false);
    }
  }

  async function handleDownload() {
    if (!record || !posting) return;
    const ok = await flushPendingSave();
    if (!ok) return;
    try {
      const res = await fetch(`/api/jobs/tailor/${record.id}/download`);
      if (!res.ok) {
        toast({ variant: 'error', title: 'Download failed' });
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const userSlug = slugify(record.payload.contact.name);
      const companySlug = slugify(posting.company_name);
      const date = new Date().toISOString().slice(0, 10);
      a.download = `${userSlug}-${companySlug}-${date}.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast({ variant: 'error', title: 'Network error downloading resume' });
    }
  }

  async function handleReadapt() {
    if (!record || !record.job_posting_id) return;
    const message = isApproved
      ? 'Generate a new resume from scratch? This will replace the approved resume — the current one stays in version history but will no longer be the active draft.'
      : 'Re-generate this resume from scratch? Current draft is saved as a version first.';
    /* eslint-disable no-alert -- personal tool, native confirm is fine */
    if (!window.confirm(message))
      /* eslint-enable no-alert */
      return;
    setReadapting(true);
    try {
      // Snapshot the current draft before regenerating so users can
      // restore it from version history if the new generation is worse.
      await flushPendingSave();
      await recordCheckpoint();
      const res = await fetch('/api/jobs/tailor/resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_description: record.jd_snapshot,
          job_posting_id: record.job_posting_id,
          force_fresh: true,
        }),
      });
      if (!res.ok) {
        toast({ variant: 'error', title: 'Re-adapt failed' });
        return;
      }
      toast({ variant: 'success', title: 'Resume re-adapted with AI' });
      setVersions(null);
      await load();
    } catch {
      toast({ variant: 'error', title: 'Network error re-adapting resume' });
    } finally {
      setReadapting(false);
    }
  }

  function restoreVersion(version: ResumeVersion) {
    // Versions before the markdown pivot stored only structured payload.
    // Newer versions include payload_md. We fall back to current markdown
    // if the snapshot has no markdown to restore.
    const md = (version as ResumeVersion & { payload_md?: string | null })
      .payload_md;
    if (!md) {
      toast({
        variant: 'error',
        title: 'This version predates markdown — cannot restore',
      });
      return;
    }
    setMarkdown(md);
    setSaveStatus('pending');
    setVersionsOpen(false);
  }

  if (notFound) {
    return (
      <main className='mx-auto max-w-4xl p-6'>
        <Heading variant='hero' as='h1'>
          Resume not found
        </Heading>
        <Text variant='body'>
          We couldn&rsquo;t find a resume for this job. Generate one from the
          job page first.
        </Text>
        <Link
          href={`/jobs/${jobPostingId}`}
          className='mt-4 inline-flex items-center gap-1 text-brand-500 hover:text-brand-600'
        >
          <ArrowLeft className='h-4 w-4' /> Back to job
        </Link>
      </main>
    );
  }

  if (loading || !record || !posting) {
    return (
      <main
        className='mx-auto max-w-4xl space-y-4 p-6'
        aria-label='Loading resume'
      >
        {/* Back link */}
        <Skeleton className='h-5 w-24' />

        {/* Title + subtitle */}
        <div className='space-y-2'>
          <Skeleton className='h-8 w-2/3' />
          <Skeleton className='h-4 w-1/2' />
        </div>

        {/* Cost stats bar */}
        <Skeleton variant='rectangular' className='h-10 w-full rounded-md' />

        {/* Version history collapsed */}
        <Skeleton variant='rectangular' className='h-10 w-full rounded-md' />

        {/* Action toolbar */}
        <div className='flex items-center justify-between'>
          <Skeleton className='h-4 w-32' />
          <div className='flex items-center gap-1'>
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton
                key={i}
                variant='rectangular'
                className='h-8 w-8 rounded-md'
              />
            ))}
          </div>
        </div>

        {/* Markdown editor */}
        <Skeleton variant='rectangular' className='h-[60vh] w-full' />
      </main>
    );
  }

  const isApproved = record.approved_at !== null;
  const isReused =
    record.warnings?.includes('reused_from_similar_job') ?? false;

  return (
    <main className='mx-auto max-w-4xl space-y-4 p-6'>
      <div className='flex items-center justify-between'>
        <Link
          href={`/jobs/${jobPostingId}`}
          className='inline-flex items-center gap-1 text-text-secondary hover:text-text-primary'
        >
          <ArrowLeft className='h-4 w-4' /> Back to job
        </Link>
        {isApproved && (
          <Badge variant='success' size='sm'>
            Locked
          </Badge>
        )}
      </div>

      <div>
        <Heading variant='hero' as='h1'>
          Review Resume
        </Heading>
        <Text variant='body' className='text-text-secondary'>
          {posting.title} &mdash; {posting.company_name}
        </Text>
      </div>

      {isReused && !isApproved && (
        <div className='flex items-start gap-2 rounded-md border border-info/30 bg-info/10 p-3'>
          <Badge variant='info' size='sm'>
            Reused
          </Badge>
          <Text variant='meta' className='text-text-secondary'>
            Cloned from a similar job &mdash; no LLM cost. Edit freely or
            re-adapt with AI to regenerate from scratch.
          </Text>
        </div>
      )}

      {lintWarnings.length > 0 && (
        <div className='rounded-md border border-warning/30 bg-warning/10 p-3'>
          <Text variant='caption' className='mb-1 text-warning'>
            ATS Lint
          </Text>
          <ul className='list-inside list-disc space-y-1'>
            {lintWarnings.map((w, i) => (
              <li key={i}>
                <Text variant='meta' as='span'>
                  [{w.code}] {w.message}
                </Text>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className='flex flex-wrap gap-x-4 gap-y-1 rounded-md bg-surface-secondary px-3 py-2'>
        <Text variant='meta' as='span'>
          Cost: ${record.cost_usd.toFixed(4)}
        </Text>
        <Text variant='meta' as='span'>
          Tokens:{' '}
          {(record.input_tokens + record.output_tokens).toLocaleString()}
        </Text>
        {record.model && (
          <Text variant='meta' as='span'>
            Model: {record.model}
          </Text>
        )}
        <Text variant='meta' as='span'>
          Latency: {(record.latency_ms / 1000).toFixed(1)}s
        </Text>
      </div>

      <div className='rounded-md border border-border'>
        <button
          type='button'
          onClick={toggleVersions}
          className='flex w-full items-center justify-between px-3 py-2 text-left hover:bg-surface-secondary'
          aria-expanded={versionsOpen}
          aria-controls='version-history-panel'
        >
          <Text variant='caption' as='span'>
            Version history{versions ? ` (${versions.length})` : ''}
          </Text>
          <Text variant='meta' as='span' className='text-text-tertiary'>
            {versionsOpen ? 'Hide' : 'Show'}
          </Text>
        </button>
        {versionsOpen && (
          <div
            id='version-history-panel'
            className='space-y-2 border-t border-border px-3 py-2'
          >
            <Text variant='meta' className='text-text-tertiary'>
              Free tier keeps the last {versionCap} versions. Older edits are
              dropped automatically.
            </Text>
            {versionsLoading && <Skeleton className='h-6 w-full' />}
            {!versionsLoading && versions !== null && versions.length === 0 && (
              <Text variant='meta' className='text-text-tertiary'>
                No prior versions yet.
              </Text>
            )}
            {!versionsLoading && versions !== null && versions.length > 0 && (
              <ul className='space-y-1'>
                {versions.map(v => (
                  <li
                    key={v.id}
                    className='flex items-center justify-between gap-2 text-sm'
                  >
                    <span className='flex items-center gap-2'>
                      <Badge
                        variant={
                          v.source === 'initial'
                            ? 'default'
                            : v.source === 'llm_adapt'
                              ? 'info'
                              : 'success'
                        }
                        size='sm'
                      >
                        {v.source.replace('_', ' ')}
                      </Badge>
                      <Text variant='meta' as='span'>
                        {new Date(v.created_at).toLocaleString()}
                      </Text>
                    </span>
                    {!isApproved && (
                      <Button
                        name={`restore-version-${v.id}`}
                        variant='ghost'
                        size='sm'
                        onClick={() => restoreVersion(v)}
                      >
                        Load
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <div>
        <div className='mb-1 flex items-center justify-between gap-2'>
          <Text variant='caption' as='span'>
            Resume markdown
          </Text>
          <div className='flex items-center gap-1'>
            <Button
              name='download-docx'
              variant='ghost'
              size='sm'
              iconOnly
              aria-label='Download resume as .docx'
              title='Download .docx'
              onClick={handleDownload}
              disabled={saveStatus === 'saving'}
            >
              <Download className='h-4 w-4' aria-hidden='true' />
            </Button>
            <Button
              name='readapt-resume'
              variant='ghost'
              size='sm'
              iconOnly
              aria-label='Re-adapt resume with AI'
              title='Re-adapt with AI'
              onClick={handleReadapt}
              disabled={
                readapting || approving || saveStatus === 'saving' || isApproved
              }
            >
              <RotateCcw className='h-4 w-4' aria-hidden='true' />
            </Button>
            {isApproved ? (
              <Button
                name='unlock-resume'
                variant='ghost'
                size='sm'
                iconOnly
                aria-label='Unlock resume for editing'
                title='Unlock for editing'
                onClick={handleUnapprove}
                disabled={unapproving}
              >
                <Unlock className='h-4 w-4' aria-hidden='true' />
              </Button>
            ) : (
              <Button
                name='lock-resume'
                variant='ghost'
                size='sm'
                iconOnly
                aria-label='Lock resume from editing'
                title='Lock from editing'
                onClick={handleApprove}
                disabled={
                  approving ||
                  saveStatus === 'pending' ||
                  saveStatus === 'saving' ||
                  saveStatus === 'error'
                }
              >
                <Lock className='h-4 w-4' aria-hidden='true' />
              </Button>
            )}
          </div>
        </div>
        <textarea
          aria-label='Resume markdown'
          className='min-h-[60vh] w-full resize-y rounded-md border border-border bg-surface p-4 font-mono text-sm leading-relaxed disabled:cursor-not-allowed disabled:opacity-60'
          value={markdown}
          onChange={e => {
            setMarkdown(e.target.value);
            setSaveStatus('pending');
          }}
          disabled={isApproved || readapting || approving || unapproving}
          spellCheck
          data-sentry-mask
        />
        <div className='flex items-center justify-between gap-2'>
          <Text
            variant='meta'
            as='span'
            className='text-text-tertiary'
            aria-live='polite'
          >
            {!isApproved && saveLabel(saveStatus)}
          </Text>
          <Text variant='meta' as='span' className='text-text-tertiary'>
            {markdown.length.toLocaleString()} chars
          </Text>
        </div>
      </div>
    </main>
  );
}

function saveLabel(status: SaveStatus): string {
  switch (status) {
    case 'idle':
      return '';
    case 'pending':
      return 'Editing — autosave pending';
    case 'saving':
      return 'Saving...';
    case 'saved':
      return 'Saved';
    case 'error':
      return 'Save failed — keep typing to retry';
  }
}
