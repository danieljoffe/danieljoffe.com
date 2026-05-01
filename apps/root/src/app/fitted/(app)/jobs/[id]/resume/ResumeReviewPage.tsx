'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
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

export default function ResumeReviewPage({
  jobPostingId,
}: ResumeReviewPageProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [posting, setPosting] = useState<JobPosting | null>(null);
  const [record, setRecord] = useState<TailoredResumeRecord | null>(null);
  const [markdown, setMarkdown] = useState('');
  const [dirty, setDirty] = useState(false);

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);
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
      setDirty(false);
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

  async function persistMarkdown(): Promise<boolean> {
    if (!record) return false;
    setSaving(true);
    setLintWarnings([]);
    try {
      const res = await fetch(`/api/jobs/tailor/${record.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markdown }),
      });
      if (res.status === 422) {
        const err = await res.json();
        toast({ variant: 'error', title: 'Resume failed ATS lint' });
        if (err.detail?.violations) {
          setLintWarnings(err.detail.violations as LintViolation[]);
        }
        return false;
      }
      if (!res.ok) {
        toast({ variant: 'error', title: 'Failed to save changes' });
        return false;
      }
      const data = (await res.json()) as TailorResponse;
      setRecord(data.record);
      setMarkdown(data.record.payload_md ?? markdown);
      setLintWarnings(data.lint_warnings);
      setDirty(false);
      return true;
    } catch {
      toast({ variant: 'error', title: 'Network error saving draft' });
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function handleSave() {
    const ok = await persistMarkdown();
    if (ok) toast({ variant: 'success', title: 'Draft saved' });
  }

  async function handleApprove() {
    if (!record) return;
    /* eslint-disable no-alert -- personal tool, native confirm is fine */
    if (
      !window.confirm(
        'Approve and lock this resume? It cannot be edited after approval.'
      )
    )
      /* eslint-enable no-alert */
      return;
    setApproving(true);
    try {
      const res = await fetch(`/api/jobs/tailor/${record.id}/approve`, {
        method: 'POST',
      });
      if (!res.ok) {
        toast({ variant: 'error', title: 'Failed to approve resume' });
        return;
      }
      toast({ variant: 'success', title: 'Resume approved' });
      router.push(`/fitted/jobs/${jobPostingId}`);
    } catch {
      toast({ variant: 'error', title: 'Network error approving resume' });
    } finally {
      setApproving(false);
    }
  }

  async function handleDownload() {
    if (!record || !posting) return;
    if (dirty) {
      const ok = await persistMarkdown();
      if (!ok) return;
    }
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
      a.download = `${posting.company_name.replace(/\s+/g, '_')}_resume.docx`;
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
    setDirty(true);
    setVersionsOpen(false);
    toast({
      variant: 'info',
      title: 'Version loaded — Save to keep changes',
    });
  }

  if (notFound) {
    return (
      <main className='mx-auto max-w-4xl p-6'>
        <Heading variant='hero' as='h1'>
          Resume not found
        </Heading>
        <Text>
          We couldn&rsquo;t find a resume for this job. Generate one from the
          job page first.
        </Text>
        <Link
          href={`/fitted/jobs/${jobPostingId}`}
          className='mt-4 inline-flex items-center gap-1 text-brand-500 hover:text-brand-600'
        >
          <ArrowLeft className='h-4 w-4' /> Back to job
        </Link>
      </main>
    );
  }

  if (loading || !record || !posting) {
    return (
      <main className='mx-auto max-w-4xl space-y-4 p-6'>
        <Skeleton className='h-6 w-32' />
        <Skeleton className='h-10 w-3/4' />
        <Skeleton className='h-[60vh] w-full' />
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
          href={`/fitted/jobs/${jobPostingId}`}
          className='inline-flex items-center gap-1 text-text-secondary hover:text-text-primary'
        >
          <ArrowLeft className='h-4 w-4' /> Back to job
        </Link>
        {isApproved && (
          <Badge variant='success' size='sm'>
            Approved &amp; locked
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
        <Text variant='caption' className='mb-1'>
          Resume markdown
        </Text>
        <textarea
          aria-label='Resume markdown'
          className='min-h-[60vh] w-full resize-y rounded-md border border-border bg-surface p-4 font-mono text-sm leading-relaxed'
          value={markdown}
          onChange={e => {
            setMarkdown(e.target.value);
            setDirty(true);
          }}
          disabled={isApproved}
          spellCheck
        />
        <Text variant='meta' className='text-right text-text-tertiary'>
          {markdown.length.toLocaleString()} chars
        </Text>
      </div>

      <div className='flex flex-wrap items-center justify-between gap-2'>
        <Button
          name='download-docx'
          variant='secondary'
          size='sm'
          onClick={handleDownload}
          disabled={saving}
        >
          {saving && dirty ? 'Saving...' : 'Download .docx'}
        </Button>
        <div className='flex flex-wrap gap-2'>
          <Button
            name='readapt-resume'
            variant='outline'
            size='sm'
            onClick={handleReadapt}
            disabled={readapting || saving || approving}
          >
            {readapting
              ? 'Generating...'
              : isApproved
                ? 'Generate New'
                : 'Re-adapt with AI'}
          </Button>
          <Button
            name='save-draft'
            variant='outline'
            size='sm'
            onClick={handleSave}
            disabled={saving || isApproved || !dirty}
          >
            {saving ? 'Saving...' : 'Save Draft'}
          </Button>
          <Button
            name='approve-resume'
            variant='primary'
            size='sm'
            onClick={handleApprove}
            disabled={approving || isApproved || dirty}
          >
            {approving
              ? 'Approving...'
              : isApproved
                ? 'Approved'
                : 'Approve & Lock'}
          </Button>
        </div>
      </div>
    </main>
  );
}
