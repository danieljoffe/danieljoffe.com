'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Badge } from '@danieljoffe.com/shared-ui/Badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@danieljoffe.com/shared-ui/Card';
import { Heading } from '@danieljoffe.com/shared-ui/Heading';
import { Input } from '@danieljoffe.com/shared-ui/Input';
import { Select } from '@danieljoffe.com/shared-ui/Select';
import { Skeleton } from '@danieljoffe.com/shared-ui/Skeleton';
import { Spinner } from '@danieljoffe.com/shared-ui/Spinner';
import { Text } from '@danieljoffe.com/shared-ui/Text';
import Button from '@/components/Button';
import { useToast } from '@/state/Toast/ToastProvider';
import type {
  Annotation,
  AnnotationAction,
  AnnotationRefType,
  Gap,
  GapHealthResult,
  OptimizedDoc,
  OptimizedResponse,
} from './types';
import {
  ANNOTATION_ACTIONS,
  ANNOTATION_ACTION_LABELS,
  ANNOTATION_REF_TYPE_LABELS,
  ANNOTATION_REF_TYPES,
  GAP_KIND_LABELS,
  GAP_KIND_WEIGHTS,
  hasOptimized,
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

// -- Component ----------------------------------------------------------------

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [optimized, setOptimized] = useState<OptimizedDoc | null>(null);
  const [gapHealth, setGapHealth] = useState<GapHealthResult | null>(null);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    try {
      const [optRes, ghRes, annRes] = await Promise.all([
        fetch('/api/career/experience/optimized'),
        fetch('/api/career/experience/gap-health'),
        fetch('/api/career/experience/annotations'),
      ]);

      if (optRes.ok) {
        const body = (await optRes.json()) as OptimizedResponse;
        setOptimized(hasOptimized(body) ? body : null);
      }

      if (ghRes.ok) {
        setGapHealth((await ghRes.json()) as GapHealthResult);
      }

      if (annRes.ok) {
        const data = (await annRes.json()) as { annotations: Annotation[] };
        setAnnotations(data.annotations);
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

  const handleAddAnnotation = useCallback(
    async (body: {
      action: AnnotationAction;
      ref_type: AnnotationRefType;
      ref_value: string;
      target_label: string | undefined;
      reason: string | undefined;
    }) => {
      try {
        const res = await fetch('/api/career/experience/annotations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error('Failed to add annotation');
        toast({ variant: 'success', title: 'Annotation added' });
        fetchData();
      } catch {
        toast({ variant: 'error', title: 'Failed to add annotation' });
      }
    },
    [toast, fetchData]
  );

  const handleDeleteAnnotation = useCallback(
    async (id: string) => {
      try {
        const res = await fetch(`/api/career/experience/annotations/${id}`, {
          method: 'DELETE',
        });
        if (!res.ok) throw new Error('Failed to remove annotation');
        toast({ variant: 'success', title: 'Annotation removed' });
        fetchData();
      } catch {
        toast({ variant: 'error', title: 'Failed to remove annotation' });
      }
    },
    [toast, fetchData]
  );

  // -- Loading state ----------------------------------------------------------

  if (loading) {
    return (
      <div className='flex flex-col gap-6'>
        <div>
          <Skeleton variant='text' size='lg' className='w-32' />
          <Skeleton variant='text' className='mt-2 w-56' />
        </div>
        <Skeleton variant='rectangular' height={200} />
        <Skeleton variant='rectangular' height={200} />
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

        <Card className='p-8 text-center'>
          <Text variant='body' className='text-text-secondary'>
            No profile data yet. Upload a resume or start a conversation from
            the Dashboard to get started.
          </Text>
        </Card>
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

      {/* Annotations */}
      <AnnotationsSection
        annotations={annotations}
        optimized={optimized}
        onAdd={handleAddAnnotation}
        onDelete={handleDeleteAnnotation}
      />

      {/* Gaps */}
      {gapHealth && gapHealth.gaps.length > 0 && (
        <GapsList gaps={gapHealth.gaps} />
      )}
    </div>
  );
}

// -- Sub-components -----------------------------------------------------------

const ACTION_BADGE_VARIANT: Record<
  AnnotationAction,
  'success' | 'error' | 'warning'
> = {
  emphasize: 'success',
  exclude: 'error',
  'de-emphasize': 'warning',
};

function AnnotationsSection({
  annotations,
  optimized,
  onAdd,
  onDelete,
}: {
  annotations: Annotation[];
  optimized: OptimizedDoc | null;
  onAdd: (body: {
    action: AnnotationAction;
    ref_type: AnnotationRefType;
    ref_value: string;
    target_label: string | undefined;
    reason: string | undefined;
  }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [showForm, setShowForm] = useState(false);

  // Build ref_value options from the optimized doc
  const refOptions = buildRefOptions(optimized);

  return (
    <Card>
      <CardHeader>
        <div className='flex items-center justify-between'>
          <CardTitle>Annotations</CardTitle>
          <Button
            name='add-annotation'
            variant='outline'
            size='sm'
            onClick={() => setShowForm(s => !s)}
          >
            <Plus className='size-4' aria-hidden />
            <span>{showForm ? 'Cancel' : 'Add'}</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent className='flex flex-col gap-3'>
        {showForm && (
          <AddAnnotationForm
            refOptions={refOptions}
            onSubmit={async body => {
              await onAdd(body);
              setShowForm(false);
            }}
          />
        )}

        {annotations.length === 0 && !showForm ? (
          <Text variant='caption' className='text-text-secondary'>
            No annotations yet. Add annotations to control how your experience
            is emphasized or excluded during resume tailoring.
          </Text>
        ) : (
          <div className='flex flex-col divide-y divide-border'>
            {annotations.map(ann => (
              <div
                key={ann.id}
                className='flex items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0'
              >
                <div className='flex flex-col gap-1 min-w-0'>
                  <div className='flex flex-wrap items-center gap-1.5'>
                    <Badge variant={ACTION_BADGE_VARIANT[ann.action]} size='sm'>
                      {ANNOTATION_ACTION_LABELS[ann.action]}
                    </Badge>
                    <Badge variant='default' size='sm'>
                      {ANNOTATION_REF_TYPE_LABELS[ann.ref_type]}
                    </Badge>
                    <Text variant='body' className='text-sm font-medium'>
                      {ann.ref_value}
                    </Text>
                  </div>
                  {ann.target_label && (
                    <Text variant='meta' className='text-text-tertiary'>
                      Target: {ann.target_label}
                    </Text>
                  )}
                  {ann.reason && (
                    <Text variant='caption' className='text-text-secondary'>
                      {ann.reason}
                    </Text>
                  )}
                </div>
                <Button
                  name={`delete-annotation-${ann.id}`}
                  variant='ghost'
                  size='sm'
                  onClick={() => onDelete(ann.id)}
                  aria-label={`Remove annotation: ${ann.action} ${ann.ref_value}`}
                >
                  <Trash2 className='size-4 text-text-tertiary' aria-hidden />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface RefOption {
  value: string;
  label: string;
  type: AnnotationRefType;
}

function buildRefOptions(optimized: OptimizedDoc | null): RefOption[] {
  if (!optimized) return [];
  const options: RefOption[] = [];

  for (const role of optimized.payload.roles) {
    options.push({
      value: role.id,
      label: `${role.title} at ${role.company}`,
      type: 'role',
    });
  }

  for (const skill of optimized.payload.skills) {
    options.push({
      value: skill.name,
      label: skill.name,
      type: 'skill',
    });
  }

  for (const outcome of optimized.payload.outcomes) {
    const label =
      outcome.description.length > 60
        ? `${outcome.description.slice(0, 60)}...`
        : outcome.description;
    options.push({
      value: outcome.description,
      label,
      type: 'outcome',
    });
  }

  return options;
}

function AddAnnotationForm({
  refOptions,
  onSubmit,
}: {
  refOptions: RefOption[];
  onSubmit: (body: {
    action: AnnotationAction;
    ref_type: AnnotationRefType;
    ref_value: string;
    target_label: string | undefined;
    reason: string | undefined;
  }) => Promise<void>;
}) {
  const [action, setAction] = useState<AnnotationAction>('emphasize');
  const [refType, setRefType] = useState<AnnotationRefType>('role');
  const [refValue, setRefValue] = useState('');
  const [targetLabel, setTargetLabel] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Filter ref options by selected type
  const filteredOptions = refOptions.filter(o => o.type === refType);

  // Auto-select first option when type changes
  useEffect(() => {
    const first = refOptions.find(o => o.type === refType);
    setRefValue(first?.value ?? '');
  }, [refType, refOptions]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!refValue.trim()) return;
    setSubmitting(true);
    try {
      await onSubmit({
        action,
        ref_type: refType,
        ref_value: refValue.trim(),
        target_label: targetLabel.trim() || undefined,
        reason: reason.trim() || undefined,
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className='flex flex-col gap-3 rounded-lg border border-border bg-surface-secondary p-3'
    >
      <div className='grid gap-3 sm:grid-cols-3'>
        <Select
          label='Action'
          value={action}
          onChange={e => setAction(e.target.value as AnnotationAction)}
          options={ANNOTATION_ACTIONS.map(a => ({
            value: a,
            label: ANNOTATION_ACTION_LABELS[a],
          }))}
        />
        <Select
          label='Type'
          value={refType}
          onChange={e => setRefType(e.target.value as AnnotationRefType)}
          options={ANNOTATION_REF_TYPES.map(t => ({
            value: t,
            label: ANNOTATION_REF_TYPE_LABELS[t],
          }))}
        />
        {filteredOptions.length > 0 ? (
          <Select
            label='Item'
            value={refValue}
            onChange={e => setRefValue(e.target.value)}
            options={filteredOptions.map(o => ({
              value: o.value,
              label: o.label,
            }))}
          />
        ) : (
          <Input
            label='Item'
            value={refValue}
            onChange={e => setRefValue(e.target.value)}
            placeholder={`Enter ${refType} name`}
          />
        )}
      </div>
      <div className='grid gap-3 sm:grid-cols-2'>
        <Input
          label='Target (optional)'
          value={targetLabel}
          onChange={e => setTargetLabel(e.target.value)}
          placeholder='Leave blank for all targets'
          helperText='Limit to a specific job target'
        />
        <Input
          label='Reason (optional)'
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder='Why this annotation?'
        />
      </div>
      <div className='flex justify-end'>
        <Button
          name='submit-annotation'
          variant='primary'
          size='sm'
          disabled={submitting || !refValue.trim()}
        >
          {submitting ? (
            <>
              <Spinner size='sm' aria-label='Adding' />
              <span>Adding...</span>
            </>
          ) : (
            'Add Annotation'
          )}
        </Button>
      </div>
    </form>
  );
}

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
