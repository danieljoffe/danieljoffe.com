'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { FileText, Layers, RefreshCw, Sparkles, Upload } from 'lucide-react';
import { Alert } from '@danieljoffe.com/shared-ui/Alert';
import { Badge } from '@danieljoffe.com/shared-ui/Badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@danieljoffe.com/shared-ui/Card';
import { Heading } from '@danieljoffe.com/shared-ui/Heading';
import { ProgressBar } from '@danieljoffe.com/shared-ui/ProgressBar';
import { Skeleton } from '@danieljoffe.com/shared-ui/Skeleton';
import { Spinner } from '@danieljoffe.com/shared-ui/Spinner';
import { Text } from '@danieljoffe.com/shared-ui/Text';
import Button from '@/components/Button';
import { consumeSse } from '@/lib/consumeSse';
import { extractApiError } from '@/lib/extractApiError';
import { parsePartialJson } from '@/lib/parsePartialJson';
import { useToast } from '@/state/Toast/ToastProvider';
import ConversationChatModal from '../../_components/ConversationChatModal';
import type {
  Gap,
  GapHealthResult,
  GapTier,
  OptimizedDoc,
  OptimizedPayload,
  OptimizedResponse,
  Outcome,
  ProseDoc,
  ProseResponse,
  Role,
  Skill,
} from './types';
import {
  GAP_KIND_LABELS,
  GAP_KIND_WEIGHTS,
  hasOptimized,
  hasProse,
} from './types';

// -- Helpers ------------------------------------------------------------------

function formatDateRange(start: string, end: string | null): string {
  const fmt = (iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short' });
  };
  return end
    ? `${fmt(start)} \u2013 ${fmt(end)}`
    : `${fmt(start)} \u2013 Present`;
}

function gapBadgeVariant(kind: string): 'error' | 'warning' | 'default' {
  const w = GAP_KIND_WEIGHTS[kind] ?? 0;
  if (w >= 3) return 'error';
  if (w >= 1) return 'warning';
  return 'default';
}

function tierToProgressVariant(tier: GapTier): 'error' | 'accent' | 'success' {
  if (tier === 'red') return 'error';
  if (tier === 'yellow') return 'accent';
  return 'success';
}

function tierToBadgeVariant(tier: GapTier): 'error' | 'warning' | 'success' {
  if (tier === 'red') return 'error';
  if (tier === 'yellow') return 'warning';
  return 'success';
}

// Mid-stream the parser may produce role/skill/outcome objects that have only
// some fields populated. Use a permissive shape so the render can guard each
// field rather than asserting Role/Skill/Outcome exactness on a partial parse.
type DisplayPayload = {
  summary: string | null;
  roles: Partial<Role>[];
  skills: Partial<Skill>[];
  outcomes: Partial<Outcome>[];
};

const ACCEPTED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// -- Component ----------------------------------------------------------------

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [optimized, setOptimized] = useState<OptimizedDoc | null>(null);
  const [gapHealth, setGapHealth] = useState<GapHealthResult | null>(null);
  const [prose, setProse] = useState<ProseDoc | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deriving, setDeriving] = useState(false);
  const [streamingPayload, setStreamingPayload] =
    useState<Partial<OptimizedPayload> | null>(null);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [consolidating, setConsolidating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Track the server's known content so autosave only fires on actual edits and
  // doesn't overwrite mid-typing when fetchData refreshes the prose state.
  const lastSavedProseRef = useRef<string | null>(null);
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    try {
      const [optRes, ghRes, proseRes] = await Promise.all([
        fetch('/api/career/experience/optimized'),
        fetch('/api/career/experience/gap-health'),
        fetch('/api/career/experience/prose'),
      ]);

      if (optRes.ok) {
        const body = (await optRes.json()) as OptimizedResponse;
        setOptimized(hasOptimized(body) ? body : null);
      }

      if (ghRes.ok) {
        setGapHealth((await ghRes.json()) as GapHealthResult);
      }

      if (proseRes.ok) {
        const body = (await proseRes.json()) as ProseResponse;
        setProse(hasProse(body) ? body : null);
      }
    } catch {
      toast({ variant: 'error', title: 'Failed to load profile data' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Sync the editable draft with the server-known prose, but skip when the
  // user has unsaved local edits — autosave will catch up on its own debounce.
  useEffect(() => {
    if (loading) return;
    if (
      lastSavedProseRef.current !== null &&
      draft !== lastSavedProseRef.current
    ) {
      return;
    }
    const content = prose?.content ?? '';
    if (content === lastSavedProseRef.current) return;
    setDraft(content);
    lastSavedProseRef.current = content;
  }, [loading, prose, draft]);

  // Autosave the master document 800ms after the user stops typing.
  useEffect(() => {
    if (loading) return;
    if (lastSavedProseRef.current === null) return;
    if (saving || deriving) return;
    if (draft === lastSavedProseRef.current) return;
    if (!draft.trim()) return;

    const handle = setTimeout(async () => {
      setSaving(true);
      try {
        const res = await fetch('/api/career/experience/prose', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: draft }),
        });
        if (!res.ok) {
          throw new Error(await extractApiError(res, 'Save failed'));
        }
        lastSavedProseRef.current = draft;
        toast({ variant: 'success', title: 'Master document saved' });
        await fetchData();
      } catch (err) {
        toast({
          variant: 'error',
          title: err instanceof Error ? err.message : 'Failed to save',
        });
      } finally {
        setSaving(false);
      }
    }, 800);
    return () => clearTimeout(handle);
  }, [draft, loading, saving, deriving, fetchData, toast]);

  const handleUpload = useCallback(
    async (file: File) => {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        toast({ variant: 'error', title: 'Please upload a PDF or DOCX file' });
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        toast({ variant: 'error', title: 'File must be under 10 MB' });
        return;
      }

      setUploading(true);
      try {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch(
          '/api/career/experience/upload-resume?auto_derive=true',
          { method: 'POST', body: formData }
        );
        if (!res.ok) {
          throw new Error(await extractApiError(res, 'Upload failed'));
        }
        toast({ variant: 'success', title: 'Resume uploaded and processed' });
        await fetchData();
      } catch (err) {
        toast({
          variant: 'error',
          title: err instanceof Error ? err.message : 'Upload failed',
        });
      } finally {
        setUploading(false);
      }
    },
    [fetchData, toast]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleUpload(file);
      e.target.value = '';
    },
    [handleUpload]
  );

  const handleDerive = useCallback(async () => {
    setDeriving(true);
    setStreamingPayload(null);
    let buffered = '';
    let cached = false;
    try {
      const res = await fetch('/api/career/experience/derive/stream', {
        method: 'POST',
      });
      // The derive endpoint is LLM-budgeted; ``enforce_llm_budget``
      // returns a structured ``llm_budget_exceeded`` 429 before the
      // stream begins. Previously we threw away the response body
      // here, so users saw the generic "Failed to re-derive
      // profile" toast with no recovery hint. ``extractApiError``
      // surfaces the actionable spend / limit message.
      if (!res.ok) throw new Error(await extractApiError(res, 'Derive failed'));

      let streamError: string | null = null;
      await consumeSse(res, (event, data) => {
        if (event === 'delta') {
          const text = (data as { text?: string }).text ?? '';
          buffered += text;
          const parsed = parsePartialJson<Partial<OptimizedPayload>>(buffered);
          if (parsed) setStreamingPayload(parsed);
        } else if (event === 'done') {
          const payload = data as { doc: OptimizedDoc; cached?: boolean };
          setOptimized(payload.doc);
          cached = Boolean(payload.cached);
        } else if (event === 'error') {
          streamError =
            (data as { detail?: string }).detail ?? 'derive stream error';
        }
      });

      if (streamError) throw new Error(streamError);

      toast({
        variant: cached ? 'info' : 'success',
        title: cached
          ? 'Profile already up to date'
          : 'Profile re-derived from experience',
      });
      await fetchData();
    } catch (err) {
      toast({
        variant: 'error',
        title:
          err instanceof Error ? err.message : 'Failed to re-derive profile',
      });
    } finally {
      setDeriving(false);
      setStreamingPayload(null);
    }
  }, [fetchData, toast]);

  const handleConsolidate = useCallback(async () => {
    setConsolidating(true);
    try {
      const res = await fetch('/api/career/experience/prose/consolidate', {
        method: 'POST',
      });
      if (!res.ok) {
        throw new Error(await extractApiError(res, 'Consolidate failed'));
      }
      const body = (await res.json()) as {
        no_op: boolean;
        chars_before: number;
        chars_after: number;
      };
      if (body.no_op) {
        toast({
          variant: 'info',
          title: 'No duplicates found in master document',
        });
      } else {
        const removed = body.chars_before - body.chars_after;
        toast({
          variant: 'success',
          title: `Consolidated — removed ${removed.toLocaleString()} characters of duplicate content`,
        });
      }
      await fetchData();
    } catch (err) {
      toast({
        variant: 'error',
        title: err instanceof Error ? err.message : 'Consolidate failed',
      });
    } finally {
      setConsolidating(false);
    }
  }, [fetchData, toast]);

  const fileInput = (
    <input
      ref={fileInputRef}
      type='file'
      accept='.pdf,.docx'
      onChange={handleFileChange}
      className='hidden'
      aria-hidden='true'
    />
  );

  // -- Loading state ----------------------------------------------------------

  if (loading) {
    return (
      <div className='flex flex-col gap-6'>
        <div>
          <Skeleton variant='text' size='lg' className='w-32' />
          <Skeleton variant='text' className='mt-2 w-56' />
        </div>
        <Skeleton variant='rectangular' height={140} />
        <Skeleton variant='rectangular' height={200} />
        <Skeleton variant='rectangular' height={200} />
      </div>
    );
  }

  // -- Zero state -------------------------------------------------------------

  if (!optimized && !prose) {
    return (
      <div className='flex flex-col gap-6'>
        <div>
          <Heading variant='hero' as='h1'>
            Profile
          </Heading>
          <Text variant='body' className='mt-1 text-text-secondary'>
            Your master experience document and derived skills
          </Text>
        </div>

        <Card>
          <CardContent className='flex flex-col items-center gap-4 py-12'>
            <Upload className='size-12 text-text-tertiary' aria-hidden />
            <Text variant='body' as='p' className='text-center'>
              Upload your resume to build your master experience document.
            </Text>
            <div className='flex items-center gap-3'>
              <Button
                name='profile-upload-resume'
                variant='primary'
                size='sm'
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? (
                  <>
                    <Spinner size='sm' aria-label='Uploading' />
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <Upload className='size-4' aria-hidden />
                    <span>Upload Resume</span>
                  </>
                )}
              </Button>
              <Button
                name='profile-start-conversation'
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

        {fileInput}
      </div>
    );
  }

  // -- Main layout ------------------------------------------------------------

  // While streaming, render parsed-so-far fields with empty defaults; this lets
  // the user see the resume materialize instead of staring at a spinner. Once
  // the `done` event lands, we swap back to the persisted optimized doc.
  const payload: DisplayPayload | undefined = streamingPayload
    ? {
        summary: streamingPayload.summary ?? null,
        roles: (streamingPayload.roles ?? []) as Partial<Role>[],
        skills: (streamingPayload.skills ?? []) as Partial<Skill>[],
        outcomes: (streamingPayload.outcomes ?? []) as Partial<Outcome>[],
      }
    : optimized?.payload;
  const roleGapRefs = new Set(
    gapHealth?.gaps
      .filter(g => g.ref && g.kind.startsWith('role.'))
      .map(g => g.ref) ?? []
  );

  return (
    <div className='flex flex-col gap-6'>
      <div>
        <Heading variant='hero' as='h1'>
          Profile
        </Heading>
        <Text variant='body' className='mt-1 text-text-secondary'>
          Your master experience document and derived skills
        </Text>
      </div>

      {deriving && (
        <Alert variant='info' aria-live='polite'>
          <div className='flex items-center gap-2'>
            <Spinner size='sm' aria-label='Generating' />
            <span>
              Generating profile from your master document — fields below update
              as they stream in. Editing is locked until generation completes.
            </span>
          </div>
        </Alert>
      )}

      {/* Document Health */}
      {gapHealth && (
        <Card>
          <CardHeader>
            <div className='flex items-center justify-between'>
              <CardTitle>Document Health</CardTitle>
              <Badge variant={tierToBadgeVariant(gapHealth.tier)} size='sm'>
                {Math.round(100 - gapHealth.gap_pct)}%
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <ProgressBar
              value={Math.round(100 - gapHealth.gap_pct)}
              variant={tierToProgressVariant(gapHealth.tier)}
              size='sm'
              aria-label='Document completeness'
            />
          </CardContent>
        </Card>
      )}

      {/* Master Document */}
      <Card>
        <CardHeader>
          <div className='flex items-center justify-between gap-3'>
            <CardTitle>
              <FileText className='mr-2 inline size-5' aria-hidden />
              Master Document
            </CardTitle>
            <div className='flex items-center gap-2'>
              {saving && (
                <Text
                  as='span'
                  variant='meta'
                  className='inline-flex items-center gap-1'
                  aria-live='polite'
                >
                  <Spinner size='sm' aria-label='Saving' />
                  <span>Saving…</span>
                </Text>
              )}
              {prose && (
                <Text variant='meta' as='span'>
                  v{prose.version} &middot;{' '}
                  {new Date(prose.created_at).toLocaleDateString()}
                </Text>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className='flex flex-col gap-3'>
          <div className='flex flex-wrap items-center gap-2'>
            <Button
              name='profile-upload'
              variant='outline'
              size='sm'
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <>
                  <Spinner size='sm' aria-label='Uploading' />
                  <span>Uploading...</span>
                </>
              ) : (
                <>
                  <Upload className='size-4' aria-hidden />
                  <span>Upload Resume</span>
                </>
              )}
            </Button>
            <Button
              name='profile-consolidate-prose'
              variant='outline'
              size='sm'
              onClick={handleConsolidate}
              disabled={consolidating || !prose}
              title='Merge duplicate sections from past resume uploads'
            >
              {consolidating ? (
                <>
                  <Spinner size='sm' aria-label='Consolidating' />
                  <span>Consolidating...</span>
                </>
              ) : (
                <>
                  <Layers className='size-4' aria-hidden />
                  <span>Consolidate</span>
                </>
              )}
            </Button>
          </div>
          <textarea
            value={draft}
            onChange={e => setDraft(e.target.value)}
            className='min-h-[300px] w-full rounded-md border border-border bg-surface-primary p-3 font-mono text-sm text-text-primary focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand'
            placeholder='Paste or type your master experience document here...'
            data-sentry-mask
          />
        </CardContent>
      </Card>

      {/* Experience */}
      {payload && payload.roles.length > 0 && (
        <Card aria-busy={deriving || undefined}>
          <CardHeader>
            <div className='flex items-center justify-between gap-2'>
              <CardTitle>Experience</CardTitle>
              <Button
                name='profile-derive'
                variant='outline'
                size='sm'
                iconOnly
                aria-label='Re-derive profile from master document'
                className='rounded-full'
                onClick={handleDerive}
                disabled={deriving}
              >
                {deriving ? (
                  <Spinner size='sm' aria-label='Re-deriving' />
                ) : (
                  <RefreshCw className='size-4' aria-hidden />
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent className='flex flex-col divide-y divide-border'>
            {payload.roles.map((role, idx) => {
              const outcomeCount =
                payload.outcomes.filter(o => o.role_ref === role.id).length +
                (role.outcome_refs?.length ?? 0);
              const hasGap = role.id ? roleGapRefs.has(role.id) : false;
              const dateRange =
                role.start !== undefined
                  ? formatDateRange(role.start, role.end ?? null)
                  : '';
              const skills = role.skills ?? [];

              return (
                <div
                  key={role.id ?? `role-${idx}`}
                  className='flex flex-col gap-2 py-3 first:pt-0 last:pb-0'
                >
                  <div className='flex items-start justify-between gap-2'>
                    <div>
                      <Text variant='body' className='font-medium'>
                        {role.title ?? ''}
                      </Text>
                      <Text variant='caption' className='text-text-secondary'>
                        {role.company ?? ''}
                        {role.company && dateRange ? ' · ' : ''}
                        {dateRange}
                      </Text>
                    </div>
                    <div className='flex shrink-0 items-center gap-1.5'>
                      {outcomeCount > 0 && (
                        <Badge variant='brand' size='sm'>
                          {outcomeCount}{' '}
                          {outcomeCount === 1 ? 'outcome' : 'outcomes'}
                        </Badge>
                      )}
                      {hasGap && (
                        <Badge variant='warning' size='sm'>
                          Has gaps
                        </Badge>
                      )}
                    </div>
                  </div>
                  {role.summary && (
                    <Text variant='caption' className='text-text-secondary'>
                      {role.summary}
                    </Text>
                  )}
                  {skills.length > 0 && (
                    <div className='flex flex-wrap gap-1'>
                      {skills.map(skill => (
                        <Badge key={skill} variant='default' size='sm'>
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Skills */}
      {payload && payload.skills.length > 0 && (
        <Card aria-busy={deriving || undefined}>
          <CardHeader>
            <CardTitle>Skills</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-3'>
              {payload.skills.map((skill, idx) => {
                const evidenceCount = skill.evidence_refs?.length ?? 0;
                return (
                  <div
                    key={skill.name ?? `skill-${idx}`}
                    className='flex items-center justify-between rounded-md border border-border px-3 py-2'
                  >
                    <Text variant='body' className='text-sm'>
                      {skill.name ?? ''}
                    </Text>
                    {evidenceCount > 0 ? (
                      <Badge variant='default' size='sm'>
                        {evidenceCount} evidence
                      </Badge>
                    ) : (
                      <Badge variant='error' size='sm'>
                        No evidence
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Gaps */}
      {gapHealth && gapHealth.gaps.length > 0 && (
        <GapsList
          gaps={gapHealth.gaps}
          tier={gapHealth.tier}
          onOpenChat={() => setChatOpen(true)}
        />
      )}

      {fileInput}

      <ConversationChatModal
        isOpen={chatOpen}
        onClose={() => setChatOpen(false)}
        onComplete={fetchData}
      />
    </div>
  );
}

// -- Sub-components -----------------------------------------------------------

function GapsList({
  gaps,
  tier,
  onOpenChat,
}: {
  gaps: Gap[];
  tier: GapTier;
  onOpenChat: () => void;
}) {
  const visible = gaps.slice(0, 10);
  const count = gaps.length;
  const cta = (
    <Button
      name='profile-answer-questions'
      variant='outline'
      size='sm'
      onClick={onOpenChat}
    >
      <Sparkles className='size-4' aria-hidden />
      <span>
        Answer {count} {count === 1 ? 'question' : 'questions'} to fill gaps
      </span>
    </Button>
  );

  return (
    <Card>
      <CardHeader>
        <div className='flex items-center justify-between'>
          <CardTitle>Gaps to Fill</CardTitle>
          <Badge variant='default' size='sm'>
            {count} {count === 1 ? 'gap' : 'gaps'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className='flex flex-col gap-4'>
        <div className='flex flex-col divide-y divide-border'>
          {visible.map((gap, i) => (
            <div
              key={`${gap.kind}-${gap.ref}-${i}`}
              className='flex items-start gap-3 py-2.5 first:pt-0 last:pb-0'
            >
              <Badge
                variant={gapBadgeVariant(gap.kind)}
                size='sm'
                className='shrink-0 mt-0.5'
              >
                {GAP_KIND_LABELS[gap.kind] ?? gap.kind}
              </Badge>
              <Text variant='caption' className='text-text-secondary'>
                {gap.context}
              </Text>
            </div>
          ))}
          {gaps.length > 10 && (
            <Text variant='caption' className='pt-2 text-text-tertiary'>
              +{gaps.length - 10} more gaps
            </Text>
          )}
        </div>
        {tier === 'red' ? (
          <Alert variant='warning'>
            <div className='flex flex-col items-start gap-2'>
              <span>
                Critical gaps detected. Generated resumes will be missing
                outcomes and metrics until you fill them in.
              </span>
              {cta}
            </div>
          </Alert>
        ) : (
          cta
        )}
      </CardContent>
    </Card>
  );
}
