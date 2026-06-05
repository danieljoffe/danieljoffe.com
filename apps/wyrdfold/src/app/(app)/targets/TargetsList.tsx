'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Sparkles } from 'lucide-react';
import { Badge } from '@danieljoffe.com/shared-ui/Badge';
import { Heading } from '@danieljoffe.com/shared-ui/Heading';
import { Spinner } from '@danieljoffe.com/shared-ui/Spinner';
import { Text } from '@danieljoffe.com/shared-ui/Text';
import { Card, CardContent } from '@danieljoffe.com/shared-ui/Card';
import Button from '@/components/Button';
import { extractApiError } from '@/lib/extractApiError';
import { useToast } from '@/state/Toast/ToastProvider';
import TargetCard from './TargetCard';
import CreateTargetModal, {
  type ManualSubmission,
  type UrlSubmission,
} from './CreateTargetModal';
import PendingTargetCard from './PendingTargetCard';
import type {
  CreateOrLinkResult,
  MatchedSuggestion,
  MatchedSuggestions,
  UserTarget,
  UserTargetWithTarget,
} from './types';

interface PendingTarget {
  id: string;
  label: string;
}

interface TargetsListProps {
  initialTargets: UserTargetWithTarget[];
}

/** Poll cadence + cap for the deriving-target refresh loop. */
const DERIVE_POLL_INTERVAL_MS = 2500;
const DERIVE_POLL_MAX_ATTEMPTS = 40; // ~100s ceiling; derivation is 5-9s

/**
 * A just-created target's scoring profile and fit score are derived in a
 * backend BackgroundTask, so the optimistic response lands before they
 * exist. "Still deriving" = the profile is being built (`deriving` status)
 * or the per-user fit score hasn't been written yet. `error` is terminal —
 * the card surfaces the failure rather than polling forever.
 */
function isDeriving(entry: UserTargetWithTarget): boolean {
  if (entry.target.activation_status === 'error') return false;
  return (
    entry.target.activation_status === 'deriving' ||
    entry.user_target.fit_score === null
  );
}

export default function TargetsList({ initialTargets }: TargetsListProps) {
  const [targets, setTargets] =
    useState<UserTargetWithTarget[]>(initialTargets);
  const [modalOpen, setModalOpen] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  // Sync local state when the parent server component re-renders with
  // fresh data (after `router.refresh()` post-mutation). Optimistic
  // updates from create/link still work because the server refetch
  // arrives with the canonical state.
  useEffect(() => {
    setTargets(initialTargets);
  }, [initialTargets]);

  const handleActivate = useCallback(
    async (id: string) => {
      try {
        const res = await fetch(`/api/targets/${id}/activate`, {
          method: 'POST',
        });
        if (!res.ok)
          throw new Error(await extractApiError(res, 'Activate failed'));
        toast({ variant: 'success', title: 'Target activated' });
        // RSC re-render rather than a second client fetch — saves a
        // round-trip and keeps the targets page authoritative on the
        // server.
        router.refresh();
      } catch (err) {
        toast({
          variant: 'error',
          title:
            err instanceof Error ? err.message : 'Failed to activate target',
        });
      }
    },
    [toast, router]
  );

  const handleDeactivate = useCallback(
    async (id: string) => {
      try {
        const res = await fetch(`/api/targets/${id}/deactivate`, {
          method: 'POST',
        });
        if (!res.ok)
          throw new Error(await extractApiError(res, 'Deactivate failed'));
        toast({ variant: 'success', title: 'Target deactivated' });
        router.refresh();
      } catch (err) {
        toast({
          variant: 'error',
          title:
            err instanceof Error ? err.message : 'Failed to deactivate target',
        });
      }
    },
    [toast, router]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      /* eslint-disable no-alert -- personal tool */
      if (!window.confirm('Delete this target?')) return;
      /* eslint-enable no-alert */

      try {
        const res = await fetch(`/api/targets/${id}`, { method: 'DELETE' });
        if (!res.ok)
          throw new Error(await extractApiError(res, 'Delete failed'));
        toast({ variant: 'success', title: 'Target deleted' });
        // Optimistic removal so the card disappears instantly; refresh
        // brings authoritative state to backstop the optimistic delete.
        setTargets(prev => prev.filter(t => t.target.id !== id));
        router.refresh();
      } catch (err) {
        toast({
          variant: 'error',
          title: err instanceof Error ? err.message : 'Failed to delete target',
        });
      }
    },
    [toast, router]
  );

  const handleViewJobs = useCallback(
    (id: string) => {
      router.push(`/jobs?target=${id}`);
    },
    [router]
  );

  const [pendingTargets, setPendingTargets] = useState<PendingTarget[]>([]);

  // Target ids whose profile/fit score is still being derived in the
  // background. Seeded from create/link responses below, and from any
  // target the server reports as `deriving` (so a reload mid-derivation
  // resumes polling). The effect below polls each until it settles.
  const [derivingIds, setDerivingIds] = useState<Set<string>>(() => new Set());

  const pollKey = useMemo(() => {
    const ids = new Set(derivingIds);
    for (const t of targets) {
      if (t.target.activation_status === 'deriving') ids.add(t.target.id);
    }
    return [...ids].sort().join(',');
  }, [derivingIds, targets]);

  useEffect(() => {
    if (!pollKey) return;
    const ids = pollKey.split(',');
    let cancelled = false;
    let attempts = 0;
    let timer: ReturnType<typeof setTimeout>;

    const settle = (id: string) =>
      setDerivingIds(prev => {
        if (!prev.has(id)) return prev;
        const next = new Set(prev);
        next.delete(id);
        return next;
      });

    const tick = async () => {
      attempts += 1;
      const results = await Promise.all(
        ids.map(async id => {
          try {
            const res = await fetch(`/api/targets/${id}/user-target`);
            if (!res.ok) return null;
            return (await res.json()) as UserTargetWithTarget;
          } catch {
            // Transient network error — try again on the next tick.
            return null;
          }
        })
      );
      if (cancelled) return;

      const byId = new Map(
        results
          .filter((e): e is UserTargetWithTarget => e !== null)
          .map(e => [e.target.id, e])
      );
      // Reflect the latest server state on each card (profile counts,
      // fit-score badge, status indicator).
      setTargets(prev => prev.map(t => byId.get(t.target.id) ?? t));
      for (const [id, entry] of byId) {
        if (!isDeriving(entry)) settle(id);
      }

      if (attempts >= DERIVE_POLL_MAX_ATTEMPTS) {
        ids.forEach(settle);
        // Backstop: pull authoritative state in case a poll was missed.
        router.refresh();
        return;
      }
      // Schedule the next poll only after this one resolves (no overlap).
      timer = setTimeout(() => void tick(), DERIVE_POLL_INTERVAL_MS);
    };

    timer = setTimeout(() => void tick(), DERIVE_POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [pollKey, router]);

  const runCreate = useCallback(
    async (
      endpoint: '/api/targets/from-manual' | '/api/targets/from-url',
      body: object,
      pendingLabel: string
    ) => {
      const pendingId =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `pending-${Date.now()}-${Math.random()}`;
      setPendingTargets(p => [...p, { id: pendingId, label: pendingLabel }]);
      setModalOpen(false);
      setSuggestions([]);

      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          throw new Error(await extractApiError(res, 'Failed to add target'));
        }
        const result = (await res.json()) as CreateOrLinkResult;
        const alreadyLinked = targets.some(
          t => t.target.id === result.target.id
        );
        toast({
          variant: 'success',
          title: result.was_matched
            ? alreadyLinked
              ? `Already in your targets: ${result.target.label}`
              : `Linked to existing target: ${result.target.label}`
            : `Target added: ${result.target.label}`,
        });
        // Use the response directly so the new card shows even if /mine
        // is slow or fails. Replace any existing entry with the same
        // target id (covers the was_matched=true relink path).
        const entry = {
          user_target: result.user_target,
          target: result.target,
        };
        setTargets(prev => [
          entry,
          ...prev.filter(t => t.target.id !== result.target.id),
        ]);
        // Profile + fit score derive in the background — poll until ready.
        if (isDeriving(entry)) {
          setDerivingIds(prev => new Set(prev).add(entry.target.id));
        }
      } catch (e) {
        toast({
          variant: 'error',
          title: e instanceof Error ? e.message : 'Failed to add target',
        });
      } finally {
        setPendingTargets(p => p.filter(t => t.id !== pendingId));
      }
    },
    [toast, targets]
  );

  const handleSubmitManual = useCallback(
    (payload: ManualSubmission) => {
      void runCreate('/api/targets/from-manual', payload, payload.label);
    },
    [runCreate]
  );

  const handleSubmitUrl = useCallback(
    (payload: UrlSubmission) => {
      void runCreate('/api/targets/from-url', payload, payload.label ?? '');
    },
    [runCreate]
  );

  const [suggestions, setSuggestions] = useState<MatchedSuggestion[]>([]);
  const [suggesting, setSuggesting] = useState(false);
  const [addingSuggestion, setAddingSuggestion] = useState<string | null>(null);

  const handleSuggest = useCallback(async () => {
    setSuggesting(true);
    setSuggestions([]);
    try {
      const res = await fetch('/api/targets/suggest', { method: 'POST' });
      if (!res.ok)
        throw new Error(await extractApiError(res, 'Suggest failed'));
      const data = (await res.json()) as MatchedSuggestions;
      setSuggestions(data.matches);
      if (data.matches.length === 0) {
        toast({
          variant: 'info',
          title: 'No new suggestions',
          description:
            'Your existing targets already cover roles that fit your experience.',
        });
      }
    } catch (err) {
      toast({
        variant: 'error',
        title:
          err instanceof Error ? err.message : 'Failed to generate suggestions',
      });
    } finally {
      setSuggesting(false);
    }
  }, [toast]);

  const handleAddSuggestion = useCallback(
    async (match: MatchedSuggestion) => {
      const label = match.suggestion.label;
      setAddingSuggestion(label);
      try {
        let entry: UserTargetWithTarget;
        if (match.is_new) {
          const res = await fetch('/api/targets/from-manual', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              label,
              description: match.suggestion.description,
            }),
          });
          if (!res.ok) {
            throw new Error(await extractApiError(res, 'Failed to add target'));
          }
          const result = (await res.json()) as CreateOrLinkResult;
          entry = { user_target: result.user_target, target: result.target };
        } else {
          const matchedTarget = match.matched_target!;
          const linkRes = await fetch(`/api/targets/${matchedTarget.id}/link`, {
            method: 'POST',
          });
          if (!linkRes.ok) throw new Error('Link failed');
          const userTarget = (await linkRes.json()) as UserTarget;
          entry = { user_target: userTarget, target: matchedTarget };
        }

        toast({
          variant: 'success',
          title: `Added "${label}"`,
        });
        setSuggestions(prev => prev.filter(s => s.suggestion.label !== label));
        setTargets(prev => [
          entry,
          ...prev.filter(t => t.target.id !== entry.target.id),
        ]);
        if (isDeriving(entry)) {
          setDerivingIds(prev => new Set(prev).add(entry.target.id));
        }
      } catch (e) {
        toast({
          variant: 'error',
          title: e instanceof Error ? e.message : 'Failed to add target',
        });
      } finally {
        setAddingSuggestion(null);
      }
    },
    [toast]
  );

  const hasContent = targets.length > 0 || pendingTargets.length > 0;

  return (
    <div className='flex flex-col gap-6'>
      {!hasContent ? (
        <Card>
          <CardContent className='flex flex-col items-center gap-3 py-12'>
            <Text variant='body' as='p'>
              No targets yet. Create your first target to start scoring jobs
              against a specific role profile.
            </Text>
            <div className='flex flex-col items-stretch gap-3 sm:flex-row sm:items-center'>
              <Button
                name='target-create-empty'
                variant='primary'
                size='sm'
                onClick={() => setModalOpen(true)}
              >
                <Plus className='size-4' aria-hidden />
                <span>Create Target</span>
              </Button>
              <Button
                name='target-suggest-empty'
                variant='outline'
                size='sm'
                onClick={handleSuggest}
                disabled={suggesting}
              >
                <Sparkles className='size-4' aria-hidden />
                <span>Suggest from Experience</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
            {pendingTargets.map(p => (
              <PendingTargetCard key={p.id} label={p.label} />
            ))}
            {targets.map(({ user_target, target }) => (
              <TargetCard
                key={target.id}
                target={target}
                isActive={user_target.is_active}
                fitScore={user_target.fit_score}
                fitScoreReasoning={user_target.fit_score_reasoning}
                onActivate={handleActivate}
                onDeactivate={handleDeactivate}
                onDelete={handleDelete}
                onViewJobs={handleViewJobs}
              />
            ))}
          </div>

          <div className='flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center'>
            <Button
              name='target-create'
              variant='primary'
              size='sm'
              onClick={() => setModalOpen(true)}
            >
              <Plus className='size-4' aria-hidden />
              <span>Add Target</span>
            </Button>
            <Button
              name='target-suggest'
              variant='outline'
              size='sm'
              onClick={handleSuggest}
              disabled={suggesting}
            >
              {suggesting ? (
                <>
                  <Spinner size='sm' aria-label='Suggesting' />
                  <span>Suggesting...</span>
                </>
              ) : (
                <>
                  <Sparkles className='size-4' aria-hidden />
                  <span>Suggest from Experience</span>
                </>
              )}
            </Button>
          </div>
        </>
      )}

      {suggestions.length > 0 && (
        <div className='flex flex-col gap-3'>
          <Text variant='caption'>Suggested targets from your experience</Text>
          <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-3'>
            {suggestions.map(match => (
              <Card key={match.suggestion.label} padding='none'>
                <CardContent className='p-4 flex flex-col gap-2'>
                  <div className='flex items-center gap-2'>
                    <Heading variant='cardTitle'>
                      {match.suggestion.label}
                    </Heading>
                    {!match.is_new && (
                      <Badge variant='default' size='sm'>
                        Existing
                      </Badge>
                    )}
                  </div>
                  <Text variant='caption' className='text-text-secondary'>
                    {match.suggestion.description}
                  </Text>
                  {match.suggestion.core_skills.length > 0 && (
                    <div className='flex flex-wrap gap-1'>
                      {match.suggestion.core_skills.map(skill => (
                        <Badge key={skill} variant='default' size='sm'>
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <Button
                    name={`add-suggestion-${match.suggestion.label}`}
                    variant='primary'
                    size='sm'
                    onClick={() => handleAddSuggestion(match)}
                    disabled={addingSuggestion === match.suggestion.label}
                    className='mt-1 self-start'
                  >
                    {addingSuggestion === match.suggestion.label
                      ? 'Adding...'
                      : 'Add Target'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <CreateTargetModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmitManual={handleSubmitManual}
        onSubmitUrl={handleSubmitUrl}
      />
    </div>
  );
}
