'use client';

import { useCallback, useMemo, useState } from 'react';
import { RotateCcw, Undo2 } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@danieljoffe/shared-ui/Card';
import { Text } from '@danieljoffe/shared-ui/Text';
import { Badge } from '@danieljoffe/shared-ui/Badge';
import { Spinner } from '@danieljoffe/shared-ui/Spinner';
import Button from '@/components/Button';
import { extractApiError } from '@/lib/extractApiError';
import { useToast } from '@/state/Toast/ToastProvider';
import {
  AXIS_KEYS,
  DEFAULT_AXIS_WEIGHTS,
  type AxisKey,
  type AxisWeights,
  type UserTarget,
} from '../types';
import {
  AXIS_HINTS,
  AXIS_LABELS,
  AXIS_WEIGHT_MAX,
  AXIS_WEIGHT_MIN,
  AXIS_WEIGHT_STEP,
  axisWeightsEqual,
  formatAxisWeightPercent,
  isDefaultAxisWeights,
  normalizeAxisWeights,
  roundAxisWeight,
} from './axisWeights';

interface AxisWeightsEditorProps {
  targetId: string;
  userTarget: UserTarget;
  onUpdated: (next: UserTarget) => void;
}

/**
 * Per-(user, target) tunable axis weights panel.
 *
 * Always-visible top-level section on the target page. The normalized
 * preview is the safety UI from the plan — users see the effective
 * blend before saving, since the backend renormalizes any non-zero
 * set of inputs.
 */
export default function AxisWeightsEditor({
  targetId,
  userTarget,
  onUpdated,
}: AxisWeightsEditorProps) {
  const savedWeights: AxisWeights = userTarget.axis_weights ?? {
    ...DEFAULT_AXIS_WEIGHTS,
  };

  const [draft, setDraft] = useState<AxisWeights>(savedWeights);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [undoing, setUndoing] = useState(false);
  const { toast } = useToast();

  const isDirty = useMemo(
    () => !axisWeightsEqual(draft, savedWeights),
    [draft, savedWeights]
  );

  const normalized = useMemo(() => normalizeAxisWeights(draft), [draft]);
  const draftIsDefault = useMemo(() => isDefaultAxisWeights(draft), [draft]);
  const canUndo = userTarget.axis_weights_previous !== null;
  const anyBusy = saving || resetting || undoing;

  const updateAxis = useCallback((axis: AxisKey, value: number) => {
    setDraft(prev => ({ ...prev, [axis]: roundAxisWeight(value) }));
  }, []);

  const applyUpdated = useCallback(
    (updated: UserTarget) => {
      onUpdated(updated);
      setDraft(updated.axis_weights ?? { ...DEFAULT_AXIS_WEIGHTS });
    },
    [onUpdated]
  );

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/targets/${targetId}/axis-weights`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      });
      if (!res.ok)
        throw new Error(await extractApiError(res, 'Failed to save weights'));
      const updated = (await res.json()) as UserTarget;
      applyUpdated(updated);
      toast({ variant: 'success', title: 'Axis weights saved' });
    } catch (err) {
      toast({
        variant: 'error',
        title: err instanceof Error ? err.message : 'Failed to save weights',
      });
    } finally {
      setSaving(false);
    }
  }, [targetId, draft, applyUpdated, toast]);

  const handleReset = useCallback(async () => {
    setResetting(true);
    try {
      const res = await fetch(`/api/targets/${targetId}/axis-weights`, {
        method: 'DELETE',
      });
      if (!res.ok)
        throw new Error(await extractApiError(res, 'Failed to reset weights'));
      const updated = (await res.json()) as UserTarget;
      applyUpdated(updated);
      toast({ variant: 'success', title: 'Weights reset to defaults' });
    } catch (err) {
      toast({
        variant: 'error',
        title: err instanceof Error ? err.message : 'Failed to reset weights',
      });
    } finally {
      setResetting(false);
    }
  }, [targetId, applyUpdated, toast]);

  const handleUndo = useCallback(async () => {
    setUndoing(true);
    try {
      const res = await fetch(`/api/targets/${targetId}/axis-weights/undo`, {
        method: 'POST',
      });
      if (!res.ok)
        throw new Error(await extractApiError(res, 'Failed to undo'));
      const updated = (await res.json()) as UserTarget;
      applyUpdated(updated);
      toast({ variant: 'success', title: 'Reverted last change' });
    } catch (err) {
      toast({
        variant: 'error',
        title: err instanceof Error ? err.message : 'Failed to undo',
      });
    } finally {
      setUndoing(false);
    }
  }, [targetId, applyUpdated, toast]);

  return (
    <Card>
      <CardHeader>
        <div className='flex items-baseline justify-between gap-2'>
          <CardTitle>Weight axes</CardTitle>
          {userTarget.axis_weights === null ? (
            <Badge variant='default' size='sm'>
              Defaults
            </Badge>
          ) : (
            <Badge variant='info' size='sm'>
              Custom
            </Badge>
          )}
        </div>
        <Text variant='meta' className='text-text-secondary'>
          Tune how much each of the four scoring axes contributes to a
          job&rsquo;s overall fit score. Weights renormalize on save — relative
          values are what matter.
        </Text>
      </CardHeader>

      <CardContent className='flex flex-col gap-5'>
        <div className='flex flex-col gap-4'>
          {AXIS_KEYS.map(axis => {
            const value = draft[axis];
            const inputId = `axis-${axis}`;
            return (
              <div key={axis} className='flex flex-col gap-1'>
                <div className='flex items-center justify-between gap-2'>
                  <label
                    htmlFor={inputId}
                    className='text-sm font-medium text-text-primary'
                  >
                    {AXIS_LABELS[axis]}
                  </label>
                  <Text
                    variant='meta'
                    className='text-text-secondary tabular-nums'
                  >
                    {formatAxisWeightPercent(value)}
                  </Text>
                </div>
                <input
                  id={inputId}
                  type='range'
                  min={AXIS_WEIGHT_MIN}
                  max={AXIS_WEIGHT_MAX}
                  step={AXIS_WEIGHT_STEP}
                  value={value}
                  onChange={e => updateAxis(axis, parseFloat(e.target.value))}
                  aria-label={`${AXIS_LABELS[axis]} weight`}
                  aria-describedby={`${inputId}-hint`}
                  disabled={anyBusy}
                  className='w-full accent-brand-500'
                />
                <Text
                  id={`${inputId}-hint`}
                  variant='meta'
                  className='text-text-tertiary'
                >
                  {AXIS_HINTS[axis]}
                </Text>
              </div>
            );
          })}
        </div>

        {/* Normalized preview — the safety UI. Shows exactly what the
              backend will apply, since weights are renormalized at read
              time. */}
        <div
          className='rounded-lg border border-border bg-surface px-3 py-2'
          aria-live='polite'
        >
          <Text variant='meta' className='text-text-secondary mb-1'>
            Will apply as (renormalized to sum to 100%):
          </Text>
          <div className='grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-4'>
            {AXIS_KEYS.map(axis => (
              <div
                key={axis}
                className='flex items-center justify-between gap-2'
              >
                <Text variant='meta' className='text-text-secondary'>
                  {AXIS_LABELS[axis]}
                </Text>
                <Text variant='meta' className='text-text-primary tabular-nums'>
                  {formatAxisWeightPercent(normalized[axis])}
                </Text>
              </div>
            ))}
          </div>
          {draftIsDefault && (
            <Text variant='meta' className='text-text-tertiary mt-2'>
              These are the default weights — saving has the same effect as
              resetting.
            </Text>
          )}
        </div>

        <div className='flex flex-wrap items-center justify-end gap-2'>
          <Button
            name='axis-weights-undo'
            variant='ghost'
            size='sm'
            onClick={handleUndo}
            disabled={!canUndo || anyBusy}
          >
            {undoing ? (
              <>
                <Spinner size='sm' />
                <span>Undoing…</span>
              </>
            ) : (
              <>
                <Undo2 className='size-4' aria-hidden />
                <span>Undo</span>
              </>
            )}
          </Button>
          <Button
            name='axis-weights-reset'
            variant='ghost'
            size='sm'
            onClick={handleReset}
            disabled={anyBusy || userTarget.axis_weights === null}
          >
            {resetting ? (
              <>
                <Spinner size='sm' />
                <span>Resetting…</span>
              </>
            ) : (
              <>
                <RotateCcw className='size-4' aria-hidden />
                <span>Reset</span>
              </>
            )}
          </Button>
          <Button
            name='axis-weights-save'
            variant='primary'
            size='sm'
            onClick={handleSave}
            disabled={!isDirty || anyBusy}
          >
            {saving ? (
              <>
                <Spinner size='sm' />
                <span>Saving…</span>
              </>
            ) : (
              'Save'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
