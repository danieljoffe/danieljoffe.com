'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Download,
  Lock,
  MoreVertical,
  RotateCcw,
  Unlock,
} from 'lucide-react';
import { Dropdown } from '@danieljoffe.com/shared-ui/Dropdown';
import type { DropdownItem } from '@danieljoffe.com/shared-ui/Dropdown';
import { Badge } from '@danieljoffe.com/shared-ui/Badge';
import { Heading } from '@danieljoffe.com/shared-ui/Heading';
import { Skeleton } from '@danieljoffe.com/shared-ui/Skeleton';
import { Text } from '@danieljoffe.com/shared-ui/Text';
import Button from '@/components/Button';
import { extractApiError } from '@/lib/extractApiError';
import { useToast } from '@/state/Toast/ToastProvider';
import type {
  CoverLetterPayload,
  JobPosting,
  LintViolation,
  ResumeVersion,
  ResumeVersionsResponse,
  TailoredResumeRecord,
  TailorResponse,
} from '../../types';

interface CoverLetterReviewPageProps {
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
      .replace(/^-+|-+$/g, '') || 'cover-letter'
  );
}

export default function CoverLetterReviewPage({
  jobPostingId,
}: CoverLetterReviewPageProps) {
  const { toast } = useToast();

  const [posting, setPosting] = useState<JobPosting | null>(null);
  const [record, setRecord] = useState<TailoredResumeRecord | null>(null);
  const [markdown, setMarkdown] = useState('');
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [approving, setApproving] = useState(false);
  const [unapproving, setUnapproving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [lintWarnings, setLintWarnings] = useState<LintViolation[]>([]);

  const [versions, setVersions] = useState<ResumeVersion[] | null>(null);
  const [versionCap, setVersionCap] = useState<number>(5);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [versionsOpen, setVersionsOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [jobRes, letterRes] = await Promise.all([
        fetch(`/api/jobs/${jobPostingId}`),
        fetch(`/api/jobs/tailor/by-job/${jobPostingId}/cover-letter`),
      ]);
      if (jobRes.status === 404 || letterRes.status === 404) {
        setNotFound(true);
        return;
      }
      if (!jobRes.ok || !letterRes.ok) {
        toast({ variant: 'error', title: 'Failed to load cover letter' });
        return;
      }
      const job = (await jobRes.json()) as JobPosting;
      const letter = (await letterRes.json()) as TailoredResumeRecord;
      setPosting(job);
      setRecord(letter);
      setMarkdown(letter.payload_md ?? '');
      setSaveStatus('idle');
    } catch {
      toast({ variant: 'error', title: 'Network error loading cover letter' });
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
        toast({
          variant: 'error',
          title: await extractApiError(res, 'Failed to load version history'),
        });
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
        toast({ variant: 'error', title: 'Cover letter failed ATS lint' });
        if (err.detail?.violations) {
          setLintWarnings(err.detail.violations as LintViolation[]);
        }
        setSaveStatus('error');
        return false;
      }
      if (!res.ok) {
        toast({
          variant: 'error',
          title: await extractApiError(res, 'Failed to save changes'),
        });
        setSaveStatus('error');
        return false;
      }
      const data = (await res.json()) as TailorResponse;
      setRecord(data.record);
      setLintWarnings(data.lint_warnings);
      setMarkdown(curr =>
        curr === sentMarkdown ? (data.record.payload_md ?? curr) : curr
      );
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

  useEffect(() => {
    if (saveStatus !== 'pending') return;
    const timer = setTimeout(() => {
      persistMarkdown();
    }, AUTOSAVE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [markdown, saveStatus, persistMarkdown]);

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
      // Best-effort.
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
      await recordCheckpoint();
      const res = await fetch(`/api/jobs/tailor/${record.id}/approve`, {
        method: 'POST',
      });
      if (!res.ok) {
        toast({
          variant: 'error',
          title: await extractApiError(res, 'Failed to lock cover letter'),
        });
        return;
      }
      const approved = (await res.json()) as TailoredResumeRecord;
      setRecord(approved);
      toast({ variant: 'success', title: 'Cover letter locked' });
    } catch {
      toast({
        variant: 'error',
        title: 'Network error locking cover letter',
      });
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
        toast({
          variant: 'error',
          title: await extractApiError(res, 'Failed to unlock cover letter'),
        });
        return;
      }
      const reopened = (await res.json()) as TailoredResumeRecord;
      setRecord(reopened);
      toast({ variant: 'success', title: 'Cover letter unlocked for editing' });
    } catch {
      toast({
        variant: 'error',
        title: 'Network error unlocking cover letter',
      });
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
        toast({
          variant: 'error',
          title: await extractApiError(res, 'Download failed'),
        });
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const payload = record.payload as CoverLetterPayload;
      const userSlug = slugify(payload.contact.name);
      const companySlug = slugify(posting.company_name);
      const date = new Date().toISOString().slice(0, 10);
      a.download = `${userSlug}-${companySlug}-cover-letter-${date}.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast({
        variant: 'error',
        title: 'Network error downloading cover letter',
      });
    }
  }

  async function handleRegenerate() {
    if (!record || !posting) return;
    const message = isApproved
      ? 'Generate a new cover letter from scratch? This will replace the approved letter — the current one stays in version history but will no longer be the active draft.'
      : 'Re-generate this cover letter from scratch? Current draft is saved as a version first.';
    /* eslint-disable no-alert -- personal tool, native confirm is fine */
    if (!window.confirm(message))
      /* eslint-enable no-alert */
      return;
    setRegenerating(true);
    try {
      await flushPendingSave();
      await recordCheckpoint();
      const res = await fetch('/api/jobs/tailor/cover-letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_posting_id: jobPostingId,
          company_name: posting.company_name,
          role_title: posting.title,
        }),
      });
      if (!res.ok) {
        // LLM-budgeted route — without ``extractApiError`` here, hitting
        // the daily/hourly cap would render as the generic
        // "Re-generation failed" instead of the structured "$X of $Y
        // budget reached" message (PR #701).
        toast({
          variant: 'error',
          title: await extractApiError(res, 'Re-generation failed'),
        });
        return;
      }
      toast({ variant: 'success', title: 'Cover letter re-generated with AI' });
      setVersions(null);
      await load();
    } catch {
      toast({
        variant: 'error',
        title: 'Network error re-generating cover letter',
      });
    } finally {
      setRegenerating(false);
    }
  }

  async function restoreVersion(version: ResumeVersion) {
    const md = (version as ResumeVersion & { payload_md?: string | null })
      .payload_md;
    if (!md) {
      toast({
        variant: 'error',
        title: 'This version predates markdown — cannot restore',
      });
      return;
    }
    /* eslint-disable no-alert -- personal tool, native confirm is fine */
    if (
      !window.confirm(
        'Load this version? Your current draft is saved as a version first so you can roll back.'
      )
    )
      /* eslint-enable no-alert */
      return;
    // Mirrors ResumeReviewPage — snapshot the live draft before
    // ``setMarkdown(md)`` so the autosave that follows doesn't
    // overwrite the live document without leaving a recoverable
    // entry in version history.
    await flushPendingSave();
    await recordCheckpoint();
    setMarkdown(md);
    setSaveStatus('pending');
    setVersionsOpen(false);
  }

  // ``(app)/layout.tsx`` already supplies the page's ``<main>``
  // landmark — wrapping page content in a second ``<main>`` here
  // gives SR users two main landmarks per page (WCAG 1.3.1).
  if (notFound) {
    return (
      <div className='mx-auto max-w-4xl p-6'>
        <Heading variant='hero' as='h1'>
          Cover letter not found
        </Heading>
        <Text variant='body'>
          We couldn&rsquo;t find a cover letter for this job. Generate one from
          the job page first.
        </Text>
        <Link
          href={`/jobs/${jobPostingId}`}
          className='mt-4 inline-flex items-center gap-1 text-brand-500 hover:text-brand-600'
        >
          <ArrowLeft className='h-4 w-4' /> Back to job
        </Link>
      </div>
    );
  }

  if (loading || !record || !posting) {
    return (
      <div
        className='mx-auto max-w-4xl space-y-4 p-6'
        aria-label='Loading cover letter'
        role='status'
      >
        {/* Back link */}
        <Skeleton className='h-5 w-24' />

        {/* Hero h1 "Review Cover Letter" + body subtitle ("Job Title — Company"). */}
        <div className='space-y-2'>
          <Skeleton variant='rectangular' className='h-10 w-80' />
          <Skeleton className='h-4 w-72' />
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
      </div>
    );
  }

  const isApproved = record.approved_at !== null;

  return (
    <div className='mx-auto max-w-4xl space-y-4 p-6'>
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
          Review Cover Letter
        </Heading>
        <Text variant='body' className='text-text-secondary'>
          {posting.title} &mdash; {posting.company_name}
        </Text>
      </div>

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
                        // Disambiguate "Load" for SR users when
                        // multiple versions exist — see the same
                        // pattern in ResumeReviewPage.
                        aria-label={`Load ${v.source.replace('_', ' ')} version from ${new Date(v.created_at).toLocaleString()}`}
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
            Cover letter markdown
          </Text>
          {/* Same rationale as ResumeReviewPage: Download stays as
              a standalone icon (frequent, free, non-destructive);
              Re-generate (LLM-billed) and Lock/Unlock move behind a
              ``⋮`` menu to prevent mis-tap of high-cost actions. */}
          <div className='flex items-center gap-1'>
            <Button
              name='download-cover-letter-docx'
              variant='ghost'
              size='sm'
              iconOnly
              aria-label='Download cover letter as .docx'
              title='Download .docx'
              onClick={handleDownload}
              disabled={saveStatus === 'saving'}
            >
              <Download className='h-4 w-4' aria-hidden='true' />
            </Button>
            <Dropdown
              align='right'
              trigger={
                <span
                  className='inline-flex h-8 w-8 items-center justify-center rounded text-text-secondary hover:bg-surface-tertiary hover:text-text-primary'
                  aria-label='More actions'
                  title='More actions'
                >
                  <MoreVertical className='h-4 w-4' aria-hidden='true' />
                </span>
              }
              items={[
                {
                  label: 'Re-generate with AI',
                  icon: <RotateCcw className='size-4' aria-hidden />,
                  onClick: handleRegenerate,
                  disabled:
                    regenerating ||
                    approving ||
                    saveStatus === 'saving' ||
                    isApproved,
                },
                ...(isApproved
                  ? [
                      {
                        label: 'Unlock for editing',
                        icon: <Unlock className='size-4' aria-hidden />,
                        onClick: handleUnapprove,
                        disabled: unapproving,
                      } satisfies DropdownItem,
                    ]
                  : [
                      {
                        label: 'Lock from editing',
                        icon: <Lock className='size-4' aria-hidden />,
                        onClick: handleApprove,
                        danger: true,
                        disabled:
                          approving ||
                          saveStatus === 'pending' ||
                          saveStatus === 'saving' ||
                          saveStatus === 'error',
                      } satisfies DropdownItem,
                    ]),
              ]}
            />
          </div>
        </div>
        <textarea
          aria-label='Cover letter markdown'
          className='min-h-[60vh] w-full resize-y rounded-md border border-border bg-surface p-4 font-mono text-sm leading-relaxed disabled:cursor-not-allowed disabled:opacity-60'
          value={markdown}
          onChange={e => {
            setMarkdown(e.target.value);
            setSaveStatus('pending');
          }}
          disabled={isApproved || regenerating || approving || unapproving}
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
    </div>
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
