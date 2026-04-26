'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Upload,
  RefreshCw,
  Sparkles,
  FileText,
  Pencil,
  Save,
  X,
} from 'lucide-react';
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
import { useToast } from '@/state/Toast/ToastProvider';
import type {
  GapHealthResult,
  GapTier,
  OptimizedDoc,
  OptimizedResponse,
  ProseDoc,
  ProseResponse,
} from './profile/types';
import { hasOptimized, hasProse } from './profile/types';

// -- Helpers ------------------------------------------------------------------

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

const ACCEPTED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// -- Component ----------------------------------------------------------------

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [optimized, setOptimized] = useState<OptimizedDoc | null>(null);
  const [gapHealth, setGapHealth] = useState<GapHealthResult | null>(null);
  const [prose, setProse] = useState<ProseDoc | null>(null);
  const [deriving, setDeriving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
      toast({ variant: 'error', title: 'Failed to load dashboard data' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
          const data = await res.json().catch(() => null);
          throw new Error(
            (data as Record<string, string> | null)?.detail ??
              `Upload failed (${res.status})`
          );
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
    try {
      const res = await fetch('/api/career/experience/derive', {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Derive failed');
      toast({
        variant: 'success',
        title: 'Profile re-derived from experience',
      });
      await fetchData();
    } catch {
      toast({ variant: 'error', title: 'Failed to re-derive profile' });
    } finally {
      setDeriving(false);
    }
  }, [fetchData, toast]);

  const handleEditStart = useCallback(() => {
    setDraft(prose?.content ?? '');
    setEditing(true);
  }, [prose]);

  const handleEditCancel = useCallback(() => {
    setEditing(false);
    setDraft('');
  }, []);

  const handleSaveProse = useCallback(async () => {
    if (!draft.trim()) {
      toast({ variant: 'error', title: 'Document cannot be empty' });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/career/experience/prose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: draft }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(
          (data as Record<string, string> | null)?.detail ??
            `Save failed (${res.status})`
        );
      }
      toast({ variant: 'success', title: 'Master document saved' });
      setEditing(false);
      await fetchData();
    } catch (err) {
      toast({
        variant: 'error',
        title: err instanceof Error ? err.message : 'Save failed',
      });
    } finally {
      setSaving(false);
    }
  }, [draft, fetchData, toast]);

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
        <Skeleton variant='rectangular' height={120} />
        <Skeleton variant='rectangular' height={200} />
        <Skeleton variant='rectangular' height={300} />
      </div>
    );
  }

  // -- Zero state -------------------------------------------------------------

  if (!optimized) {
    return (
      <div className='flex flex-col gap-6'>
        <div>
          <Heading variant='component' as='h1'>
            Dashboard
          </Heading>
          <Text variant='body' className='mt-1 text-text-secondary'>
            Your career documents at a glance
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
                name='dashboard-upload-resume'
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
                name='dashboard-start-conversation'
                variant='outline'
                size='sm'
                as='link'
                href='/fitted/onboarding'
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

  const { payload } = optimized;

  return (
    <div className='flex flex-col gap-6'>
      <div>
        <Heading variant='component' as='h1'>
          Dashboard
        </Heading>
        <Text variant='body' className='mt-1 text-text-secondary'>
          Your career documents at a glance
        </Text>
      </div>

      {/* Document Health */}
      {gapHealth && (
        <Card>
          <CardHeader>
            <div className='flex items-center justify-between'>
              <CardTitle>Document Health</CardTitle>
              <Badge variant={tierToBadgeVariant(gapHealth.tier)} size='sm'>
                {Math.round(100 - gapHealth.gap_pct)}% complete
              </Badge>
            </div>
          </CardHeader>
          <CardContent className='flex flex-col gap-4'>
            <ProgressBar
              value={Math.round(100 - gapHealth.gap_pct)}
              variant={tierToProgressVariant(gapHealth.tier)}
              size='lg'
              aria-label='Document completeness'
            />

            {gapHealth.gap_pct >= 45 && (
              <Alert variant='warning'>
                Resume generation is blocked until gaps are below 45%. Fill in
                missing outcomes and metrics to unlock it.
              </Alert>
            )}

            <div className='flex flex-wrap items-center gap-2'>
              <Button
                name='dashboard-upload'
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
                name='dashboard-derive'
                variant='outline'
                size='sm'
                onClick={handleDerive}
                disabled={deriving}
              >
                {deriving ? (
                  <>
                    <Spinner size='sm' aria-label='Re-deriving' />
                    <span>Re-deriving...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className='size-4' aria-hidden />
                    <span>Re-derive</span>
                  </>
                )}
              </Button>
              <Button
                name='dashboard-improve-ai'
                variant='outline'
                size='sm'
                as='link'
                href='/fitted/onboarding'
              >
                <Sparkles className='size-4' aria-hidden />
                <span>Improve with AI</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Master Document */}
      <Card>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <CardTitle>
              <FileText className='mr-2 inline size-5' aria-hidden />
              Master Document
            </CardTitle>
            {prose && (
              <Text variant='meta' as='span'>
                v{prose.version} &middot;{' '}
                {new Date(prose.created_at).toLocaleDateString()}
              </Text>
            )}
          </div>
        </CardHeader>
        <CardContent className='flex flex-col gap-3'>
          {editing ? (
            <>
              <textarea
                value={draft}
                onChange={e => setDraft(e.target.value)}
                className='min-h-[300px] w-full rounded-md border border-border bg-surface-primary p-3 font-mono text-sm text-text-primary focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand'
                placeholder='Paste or type your master experience document here...'
              />
              <div className='flex items-center gap-2'>
                <Button
                  name='dashboard-save-prose'
                  variant='primary'
                  size='sm'
                  onClick={handleSaveProse}
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <Spinner size='sm' aria-label='Saving' />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save className='size-4' aria-hidden />
                      <span>Save</span>
                    </>
                  )}
                </Button>
                <Button
                  name='dashboard-save-derive'
                  variant='outline'
                  size='sm'
                  onClick={async () => {
                    await handleSaveProse();
                    if (draft.trim()) await handleDerive();
                  }}
                  disabled={saving || deriving}
                >
                  {saving || deriving ? (
                    <>
                      <Spinner size='sm' aria-label='Processing' />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className='size-4' aria-hidden />
                      <span>Save &amp; Re-derive</span>
                    </>
                  )}
                </Button>
                <Button
                  name='dashboard-cancel-edit'
                  variant='outline'
                  size='sm'
                  onClick={handleEditCancel}
                  disabled={saving}
                >
                  <X className='size-4' aria-hidden />
                  <span>Cancel</span>
                </Button>
              </div>
            </>
          ) : prose ? (
            <>
              <div className='max-h-[400px] overflow-y-auto rounded-md border border-border bg-surface-secondary p-3'>
                <pre className='whitespace-pre-wrap font-mono text-sm text-text-primary'>
                  {prose.content}
                </pre>
              </div>
              <div className='flex items-center gap-2'>
                <Button
                  name='dashboard-edit-prose'
                  variant='outline'
                  size='sm'
                  onClick={handleEditStart}
                >
                  <Pencil className='size-4' aria-hidden />
                  <span>Edit</span>
                </Button>
              </div>
            </>
          ) : (
            <div className='flex flex-col items-center gap-3 py-6'>
              <FileText className='size-10 text-text-tertiary' aria-hidden />
              <Text variant='body' as='p' className='text-center'>
                No master document yet. Upload a resume or start a conversation
                to create one.
              </Text>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Derived Document */}
      <Card>
        <CardHeader>
          <CardTitle>Derived Document</CardTitle>
        </CardHeader>
        <CardContent className='flex flex-col gap-6'>
          {/* Experience */}
          {payload.roles.length > 0 && (
            <div className='flex flex-col gap-1'>
              <Text variant='body' className='font-medium'>
                Experience
              </Text>
              <div className='flex flex-col divide-y divide-border'>
                {payload.roles.map(role => (
                  <div
                    key={role.id}
                    className='flex flex-col gap-2 py-3 first:pt-2 last:pb-0'
                  >
                    <div className='flex items-start justify-between gap-2'>
                      <div>
                        <Text variant='body' className='font-medium'>
                          {role.title}
                        </Text>
                        <Text variant='caption' className='text-text-secondary'>
                          {role.company} &middot;{' '}
                          {formatDateRange(role.start, role.end)}
                        </Text>
                      </div>
                    </div>
                    {role.summary && (
                      <Text variant='caption' className='text-text-secondary'>
                        {role.summary}
                      </Text>
                    )}
                    {role.skills.length > 0 && (
                      <div className='flex flex-wrap gap-1'>
                        {role.skills.map(skill => (
                          <Badge key={skill} variant='default' size='sm'>
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Skills */}
          {payload.skills.length > 0 && (
            <div className='flex flex-col gap-1'>
              <Text variant='body' className='font-medium'>
                Skills
              </Text>
              <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-3'>
                {payload.skills.map(skill => (
                  <div
                    key={skill.name}
                    className='flex items-center justify-between rounded-md border border-border px-3 py-2'
                  >
                    <Text variant='body' className='text-sm'>
                      {skill.name}
                    </Text>
                    {skill.evidence_refs.length > 0 ? (
                      <Badge variant='default' size='sm'>
                        {skill.evidence_refs.length} evidence
                      </Badge>
                    ) : (
                      <Badge variant='error' size='sm'>
                        No evidence
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {payload.roles.length === 0 && payload.skills.length === 0 && (
            <Text
              variant='body'
              as='p'
              className='py-4 text-center text-text-secondary'
            >
              No derived content yet. Save your master document and re-derive to
              populate this section.
            </Text>
          )}
        </CardContent>
      </Card>

      {fileInput}
    </div>
  );
}
