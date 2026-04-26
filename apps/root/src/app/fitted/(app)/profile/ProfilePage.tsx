'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Upload, RefreshCw, Sparkles } from 'lucide-react';
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
  Gap,
  GapHealthResult,
  GapTier,
  OptimizedDoc,
  OptimizedResponse,
} from './types';
import { GAP_KIND_LABELS, GAP_KIND_WEIGHTS, hasOptimized } from './types';

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

function gapBadgeVariant(kind: string): 'error' | 'warning' | 'default' {
  const w = GAP_KIND_WEIGHTS[kind] ?? 0;
  if (w >= 3) return 'error';
  if (w >= 1) return 'warning';
  return 'default';
}

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
  const [deriving, setDeriving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    try {
      const [optRes, ghRes] = await Promise.all([
        fetch('/api/career/experience/optimized'),
        fetch('/api/career/experience/gap-health'),
      ]);

      if (optRes.ok) {
        const body = (await optRes.json()) as OptimizedResponse;
        setOptimized(hasOptimized(body) ? body : null);
      }

      if (ghRes.ok) {
        setGapHealth((await ghRes.json()) as GapHealthResult);
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

  // Hidden file input shared by all upload triggers
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
        <div className='grid gap-4 md:grid-cols-2'>
          <Skeleton variant='rectangular' height={200} />
          <Skeleton variant='rectangular' height={200} />
        </div>
        <Skeleton variant='rectangular' height={140} />
      </div>
    );
  }

  // -- Zero state -------------------------------------------------------------

  if (!optimized) {
    return (
      <div className='flex flex-col gap-6'>
        <div>
          <Heading variant='component' as='h1'>
            Profile
          </Heading>
          <Text variant='body' className='mt-1 text-text-secondary'>
            Your experience and career health
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
  const roleGapRefs = new Set(
    gapHealth?.gaps
      .filter(g => g.ref && g.kind.startsWith('role.'))
      .map(g => g.ref) ?? []
  );

  return (
    <div className='flex flex-col gap-6'>
      <div>
        <Heading variant='component' as='h1'>
          Profile
        </Heading>
        <Text variant='body' className='mt-1 text-text-secondary'>
          Your experience and career health
        </Text>
      </div>

      {/* Health Summary */}
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

            {gapHealth.gap_pct >= 50 && (
              <Alert variant='warning'>
                Resume generation is blocked until gaps are below 50%. Fill in
                missing outcomes and metrics to unlock it.
              </Alert>
            )}

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
                name='profile-derive'
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
                name='profile-improve-ai'
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

      {/* Experience */}
      {payload.roles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Experience</CardTitle>
          </CardHeader>
          <CardContent className='flex flex-col divide-y divide-border'>
            {payload.roles.map(role => {
              const outcomeCount =
                payload.outcomes.filter(o => o.role_ref === role.id).length +
                role.outcome_refs.length;
              const hasGap = roleGapRefs.has(role.id);

              return (
                <div
                  key={role.id}
                  className='flex flex-col gap-2 py-3 first:pt-0 last:pb-0'
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
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Skills */}
      {payload.skills.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Skills</CardTitle>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>
      )}

      {/* Gaps */}
      {gapHealth && gapHealth.gaps.length > 0 && (
        <GapsList gaps={gapHealth.gaps} />
      )}

      {fileInput}
    </div>
  );
}

// -- Sub-components -----------------------------------------------------------

function GapsList({ gaps }: { gaps: Gap[] }) {
  const visible = gaps.slice(0, 10);

  return (
    <Card>
      <CardHeader>
        <div className='flex items-center justify-between'>
          <CardTitle>Gaps to Fill</CardTitle>
          <Badge variant='default' size='sm'>
            {gaps.length} {gaps.length === 1 ? 'gap' : 'gaps'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className='flex flex-col divide-y divide-border'>
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
      </CardContent>
    </Card>
  );
}
