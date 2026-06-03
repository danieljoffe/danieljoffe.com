'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, Pencil } from 'lucide-react';
import { Heading } from '@danieljoffe.com/shared-ui/Heading';
import { Badge } from '@danieljoffe.com/shared-ui/Badge';
import Button from '@/components/Button';
import { extractApiError } from '@/lib/extractApiError';
import { useToast } from '@/state/Toast/ToastProvider';
import type {
  JobTarget,
  TargetReferenceJD,
  UserTarget,
  UserTargetWithTarget,
} from '../types';
import ScoringProfileEditor from './ScoringProfileEditor';
import ReferenceJDList from './ReferenceJDList';
import TargetDetailSkeleton from './TargetDetailSkeleton';
import AxisWeightsEditor from './AxisWeightsEditor';

interface TargetDetailProps {
  id: string;
}

export default function TargetDetail({ id }: TargetDetailProps) {
  const [target, setTarget] = useState<JobTarget | null>(null);
  const [userTarget, setUserTarget] = useState<UserTarget | null>(null);
  const [referenceJDs, setReferenceJDs] = useState<TargetReferenceJD[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingLabel, setEditingLabel] = useState(false);
  const [labelDraft, setLabelDraft] = useState('');
  const [savingLabel, setSavingLabel] = useState(false);
  const { toast } = useToast();

  const fetchTarget = useCallback(async () => {
    try {
      const res = await fetch(`/api/targets/${id}`);
      if (!res.ok) throw new Error('Failed to fetch target');
      const data = (await res.json()) as JobTarget;
      setTarget(data);
      setLabelDraft(data.label);
    } catch {
      toast({ variant: 'error', title: 'Failed to load target' });
    }
  }, [id, toast]);

  /**
   * Pull this user's `user_target` row out of `/targets/mine`. We need
   * it for the axis-weights editor (which lives on this page, but reads
   * from `user_targets`, not the shared `targets` row). The list is
   * small (per-user, dozens of rows at most) — one round-trip is fine
   * for v1. Future optimization: a per-target `/user-target` endpoint.
   */
  const fetchUserTarget = useCallback(async () => {
    try {
      const res = await fetch(`/api/targets/mine`);
      if (!res.ok) throw new Error('Failed to fetch user target');
      const payload = (await res.json()) as {
        targets: UserTargetWithTarget[];
      };
      const match = payload.targets.find(t => t.target.id === id);
      setUserTarget(match?.user_target ?? null);
    } catch {
      // Non-fatal — the axis weights editor will just not render.
      // The rest of the page still works.
    }
  }, [id]);

  const fetchReferenceJDs = useCallback(async () => {
    try {
      const res = await fetch(`/api/targets/${id}/reference-jds`);
      if (!res.ok) throw new Error('Failed to fetch reference JDs');
      const payload = (await res.json()) as {
        reference_jds: TargetReferenceJD[];
      };
      setReferenceJDs(payload.reference_jds);
    } catch {
      toast({ variant: 'error', title: 'Failed to load reference JDs' });
    }
  }, [id, toast]);

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      fetchTarget(),
      fetchReferenceJDs(),
      fetchUserTarget(),
    ]).finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [fetchTarget, fetchReferenceJDs, fetchUserTarget]);

  const handleSaveLabel = useCallback(async () => {
    const trimmed = labelDraft.trim();
    if (!trimmed || trimmed === target?.label) {
      setEditingLabel(false);
      return;
    }

    setSavingLabel(true);
    try {
      const res = await fetch(`/api/targets/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: trimmed }),
      });
      if (!res.ok)
        throw new Error(await extractApiError(res, 'Failed to update label'));
      setTarget(prev => (prev ? { ...prev, label: trimmed } : prev));
      setEditingLabel(false);
      toast({ variant: 'success', title: 'Label updated' });
    } catch (err) {
      toast({
        variant: 'error',
        title: err instanceof Error ? err.message : 'Failed to update label',
      });
    } finally {
      setSavingLabel(false);
    }
  }, [id, labelDraft, target?.label, toast]);

  const handleRefresh = useCallback(() => {
    fetchTarget();
    fetchReferenceJDs();
  }, [fetchTarget, fetchReferenceJDs]);

  if (loading) {
    return <TargetDetailSkeleton />;
  }

  if (!target) {
    return (
      <div className='flex flex-col items-center gap-4 py-20'>
        <Heading variant='hero' as='h1'>
          Target not found
        </Heading>
        <Link href='/targets' className='text-brand-500 hover:underline'>
          Back to targets
        </Link>
      </div>
    );
  }

  return (
    <div className='flex flex-col gap-6'>
      <Link
        href='/targets'
        className='flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary transition-colors w-fit'
      >
        <ArrowLeft className='size-4' aria-hidden />
        <span>Back to targets</span>
      </Link>

      <div className='flex items-center gap-3'>
        {editingLabel ? (
          <div className='flex items-center gap-2'>
            <input
              aria-label='Target label'
              aria-describedby='label-edit-hint'
              value={labelDraft}
              onChange={e => setLabelDraft(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleSaveLabel();
                if (e.key === 'Escape') {
                  setEditingLabel(false);
                  setLabelDraft(target.label);
                }
              }}
              className='text-xl font-semibold bg-transparent border-b-2 border-brand-500 outline-none text-text-primary'
              maxLength={200}
              autoFocus
              disabled={savingLabel}
            />
            <span id='label-edit-hint' className='sr-only'>
              Press Enter to save, Escape to cancel
            </span>
            <Button
              name='target-label-save'
              variant='bare'
              size='sm'
              iconOnly
              onClick={handleSaveLabel}
              disabled={savingLabel}
              aria-label='Save label'
            >
              <Check className='size-4' />
            </Button>
          </div>
        ) : (
          <div className='flex items-center gap-2'>
            <Heading variant='hero' as='h1'>
              {target.label}
            </Heading>
            <Button
              name='target-label-edit'
              variant='bare'
              size='sm'
              iconOnly
              onClick={() => setEditingLabel(true)}
              aria-label='Edit label'
            >
              <Pencil className='size-3.5' />
            </Button>
          </div>
        )}

        {target.is_active && (
          <Badge variant='brand-solid' size='sm'>
            Active
          </Badge>
        )}
      </div>

      <ScoringProfileEditor target={target} onSaved={fetchTarget} />

      {userTarget && (
        <AxisWeightsEditor
          targetId={id}
          userTarget={userTarget}
          onUpdated={setUserTarget}
        />
      )}

      <ReferenceJDList
        targetId={id}
        referenceJDs={referenceJDs}
        onChanged={handleRefresh}
      />
    </div>
  );
}
