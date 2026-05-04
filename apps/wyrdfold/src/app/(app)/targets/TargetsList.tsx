'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Sparkles } from 'lucide-react';
import { Badge } from '@danieljoffe.com/shared-ui/Badge';
import { Heading } from '@danieljoffe.com/shared-ui/Heading';
import { Spinner } from '@danieljoffe.com/shared-ui/Spinner';
import { Text } from '@danieljoffe.com/shared-ui/Text';
import { Card, CardContent } from '@danieljoffe.com/shared-ui/Card';
import Button from '@/components/Button';
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

export default function TargetsList({ initialTargets }: TargetsListProps) {
  const [targets, setTargets] =
    useState<UserTargetWithTarget[]>(initialTargets);
  const [modalOpen, setModalOpen] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  // Re-fetch after mutating actions (activate/deactivate/delete) so the cards
  // pick up server-derived state (fit score, activation status, etc.).
  const fetchTargets = useCallback(async () => {
    try {
      const res = await fetch('/api/targets/mine');
      if (!res.ok) throw new Error('Failed to fetch targets');
      const { targets } = (await res.json()) as {
        targets: UserTargetWithTarget[];
      };
      setTargets(targets);
    } catch {
      toast({ variant: 'error', title: 'Failed to load targets' });
    }
  }, [toast]);

  const handleActivate = useCallback(
    async (id: string) => {
      try {
        const res = await fetch(`/api/targets/${id}/activate`, {
          method: 'POST',
        });
        if (!res.ok) throw new Error('Activate failed');
        toast({ variant: 'success', title: 'Target activated' });
        fetchTargets();
      } catch {
        toast({ variant: 'error', title: 'Failed to activate target' });
      }
    },
    [toast, fetchTargets]
  );

  const handleDeactivate = useCallback(
    async (id: string) => {
      try {
        const res = await fetch(`/api/targets/${id}/deactivate`, {
          method: 'POST',
        });
        if (!res.ok) throw new Error('Deactivate failed');
        toast({ variant: 'success', title: 'Target deactivated' });
        fetchTargets();
      } catch {
        toast({ variant: 'error', title: 'Failed to deactivate target' });
      }
    },
    [toast, fetchTargets]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      /* eslint-disable no-alert -- personal tool */
      if (!window.confirm('Delete this target?')) return;
      /* eslint-enable no-alert */

      try {
        const res = await fetch(`/api/targets/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Delete failed');
        toast({ variant: 'success', title: 'Target deleted' });
        fetchTargets();
      } catch {
        toast({ variant: 'error', title: 'Failed to delete target' });
      }
    },
    [toast, fetchTargets]
  );

  const handleViewJobs = useCallback(
    (id: string) => {
      router.push(`/jobs?target=${id}`);
    },
    [router]
  );

  const [pendingTargets, setPendingTargets] = useState<PendingTarget[]>([]);

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
          const err = await res.json().catch(() => null);
          throw new Error(
            (err as Record<string, string> | null)?.detail ??
              'Failed to add target'
          );
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
        setTargets(prev => [
          { user_target: result.user_target, target: result.target },
          ...prev.filter(t => t.target.id !== result.target.id),
        ]);
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
      if (!res.ok) throw new Error('Suggest failed');
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
    } catch {
      toast({ variant: 'error', title: 'Failed to generate suggestions' });
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
            const err = await res.json().catch(() => null);
            throw new Error(
              (err as Record<string, string> | null)?.detail ??
                'Failed to add target'
            );
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
      {hasContent && (
        <div className='flex justify-end'>
          <Button
            name='target-create'
            variant='primary'
            size='sm'
            iconOnly
            aria-label='Create target'
            className='rounded-full'
            onClick={() => setModalOpen(true)}
          >
            <Plus className='size-4' aria-hidden />
          </Button>
        </div>
      )}

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
                fitScore={user_target.fit_score}
                fitScoreReasoning={user_target.fit_score_reasoning}
                onActivate={handleActivate}
                onDeactivate={handleDeactivate}
                onDelete={handleDelete}
                onViewJobs={handleViewJobs}
              />
            ))}
          </div>

          <div className='flex items-center justify-center'>
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
