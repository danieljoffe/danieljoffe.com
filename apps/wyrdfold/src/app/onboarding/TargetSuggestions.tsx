'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { CheckCircle, Target } from 'lucide-react';
import { Badge } from '@danieljoffe.com/shared-ui/Badge';
import { Card } from '@danieljoffe.com/shared-ui/Card';
import { Text } from '@danieljoffe.com/shared-ui/Text';
import { Heading } from '@danieljoffe.com/shared-ui/Heading';
import { Spinner } from '@danieljoffe.com/shared-ui/Spinner';
import { Alert } from '@danieljoffe.com/shared-ui/Alert';
import Button from '@/components/Button';
import { cn } from '@/lib/cn';
import type {
  JobTarget,
  MatchedSuggestion,
  MatchedSuggestions,
} from '@/app/(app)/targets/types';
import type { JobData } from './JobUrlInput';

interface TargetSuggestionsProps {
  onComplete: () => void;
  onSkip: () => void;
  jobData?: JobData | null;
}

export default function TargetSuggestions({
  onComplete,
  onSkip,
  jobData,
}: TargetSuggestionsProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createdLabel, setCreatedLabel] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<MatchedSuggestion[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState(false);
  const [createdCount, setCreatedCount] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // Path A: auto-create target from job posting
  useEffect(() => {
    if (!jobData) return;
    const postingId = jobData.postingId;
    let cancelled = false;

    async function createFromPosting() {
      try {
        const res = await fetch(`/api/targets/from-posting/${postingId}`, {
          method: 'POST',
        });
        if (!res.ok) throw new Error('Failed to create target');
        const data = (await res.json()) as { label: string };
        if (!cancelled) {
          setCreatedLabel(data.label);
          timerRef.current = setTimeout(onComplete, 2000);
        }
      } catch {
        if (!cancelled) {
          setError(
            'Could not auto-create target. You can create one manually.'
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    createFromPosting();
    return () => {
      cancelled = true;
    };
  }, [jobData, onComplete]);

  // Paths B/C: fetch suggestions from LLM
  useEffect(() => {
    if (jobData) return;
    let cancelled = false;

    async function fetchSuggestions() {
      try {
        const res = await fetch('/api/targets/suggest', { method: 'POST' });
        if (!res.ok) throw new Error('Failed to load suggestions');
        const data = (await res.json()) as MatchedSuggestions;
        if (!cancelled && data.matches?.length > 0) {
          setSuggestions(data.matches);
          // Pre-select all suggestions
          setSelected(new Set(data.matches.map(m => m.suggestion.label)));
        }
      } catch {
        if (!cancelled)
          setError(
            'Could not generate suggestions. You can create targets manually.'
          );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchSuggestions();
    return () => {
      cancelled = true;
    };
  }, [jobData]);

  const toggleSelection = useCallback((label: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(label)) {
        next.delete(label);
      } else {
        next.add(label);
      }
      return next;
    });
  }, []);

  const handleCreateSelected = useCallback(async () => {
    if (selected.size === 0) {
      onComplete();
      return;
    }

    setCreating(true);
    let created = 0;

    for (const match of suggestions) {
      if (!selected.has(match.suggestion.label)) continue;
      try {
        let targetId: string;

        if (match.is_new) {
          const createRes = await fetch('/api/targets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              label: match.suggestion.label,
              description: match.suggestion.description,
            }),
          });
          if (!createRes.ok) continue;
          const createdTarget = (await createRes.json()) as JobTarget;
          targetId = createdTarget.id;
        } else {
          targetId = match.matched_target!.id;
        }

        const linkRes = await fetch(`/api/targets/${targetId}/link`, {
          method: 'POST',
        });
        if (!linkRes.ok) continue;
        created++;

        // Fire the activation pipeline (derive scoring profile → poll
        // sources → mark ready) without awaiting. Onboarded targets
        // were previously left at ``activation_status=idle`` because the
        // wizard only ran create+link, so no jobs got polled until the
        // user manually clicked Activate on /targets. Fire-and-forget
        // keeps the wizard responsive; failures will surface on /jobs
        // (still-idle target = no postings) rather than block the
        // completion step. Catch and swallow to avoid an unhandled
        // promise rejection — the user can re-activate from /targets if
        // the kickoff was lost.
        void fetch(`/api/targets/${targetId}/activate`, {
          method: 'POST',
        }).catch(() => undefined);
      } catch {
        // Continue creating remaining targets
      }
    }

    setCreatedCount(created);
    setCreating(false);
    timerRef.current = setTimeout(onComplete, 1500);
  }, [selected, suggestions, onComplete]);

  // Path A: auto-creation in progress or completed
  if (jobData) {
    if (loading) {
      return (
        <div className='flex flex-col items-center gap-4 py-12'>
          <Spinner size='lg' aria-label='Creating target' />
          <Text variant='body' className='text-text-secondary'>
            Setting up a target from your job posting...
          </Text>
        </div>
      );
    }

    if (createdLabel) {
      return (
        <div className='flex flex-col items-center gap-6'>
          <Card padding='lg' className='w-full text-center'>
            <div className='flex flex-col items-center gap-3 py-4'>
              <CheckCircle className='size-12 text-success' aria-hidden />
              <div>
                <Text variant='body' className='font-medium'>
                  Target created
                </Text>
                <Text variant='caption' className='mt-1 text-text-secondary'>
                  {createdLabel}
                </Text>
              </div>
            </div>
          </Card>
        </div>
      );
    }

    // Error fallback — show manual flow below
  }

  // Paths B/C: suggestions or manual prompt
  if (loading) {
    return (
      <div className='flex flex-col items-center gap-4 py-12'>
        <Spinner size='lg' aria-label='Loading suggestions' />
        <Text variant='body' className='text-text-secondary'>
          Analyzing your experience...
        </Text>
      </div>
    );
  }

  // Post-creation success
  if (createdCount > 0) {
    return (
      <div className='flex flex-col items-center gap-6'>
        <Card padding='lg' className='w-full text-center'>
          <div className='flex flex-col items-center gap-3 py-4'>
            <CheckCircle className='size-12 text-success' aria-hidden />
            <div>
              <Text variant='body' className='font-medium'>
                {createdCount === 1
                  ? '1 target created'
                  : `${createdCount} targets created`}
              </Text>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // Suggestions available — show selectable cards
  if (suggestions.length > 0) {
    return (
      <div className='flex flex-col gap-6'>
        <div className='text-center'>
          <Heading variant='cardTitle' as='h2'>
            Suggested targets
          </Heading>
          <Text variant='caption' className='mt-1 text-text-secondary'>
            Based on your experience, we suggest these role targets. Select the
            ones you&apos;d like to track.
          </Text>
        </div>

        <div className='flex flex-col gap-3'>
          {suggestions.map(match => {
            const { suggestion } = match;
            const isSelected = selected.has(suggestion.label);
            return (
              <Card
                key={suggestion.label}
                padding='lg'
                className={cn(
                  'cursor-pointer transition-colors',
                  isSelected
                    ? 'border-brand-500 bg-brand-500/5'
                    : 'hover:border-border-hover'
                )}
                onClick={() => toggleSelection(suggestion.label)}
                role='checkbox'
                aria-checked={isSelected}
                tabIndex={0}
                aria-label={suggestion.label}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleSelection(suggestion.label);
                  }
                }}
              >
                <div className='flex items-start gap-4'>
                  <div
                    className={cn(
                      'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded border-2 transition-colors',
                      isSelected
                        ? 'border-brand-500 bg-brand-500'
                        : 'border-border'
                    )}
                  >
                    {isSelected && (
                      <CheckCircle
                        className='size-3.5 text-white'
                        aria-hidden
                      />
                    )}
                  </div>
                  <div className='flex-1'>
                    <div className='flex items-center gap-2'>
                      <Text variant='body' className='font-medium'>
                        {/*
                          When the LLM-suggested label fuzzy-matches an
                          existing catalog target, ``link`` actually
                          attaches the user to ``matched_target`` — which
                          may have a different label than what the LLM
                          proposed. Showing ``suggestion.label`` here
                          was misleading: e.g. the LLM suggests
                          "Full-Stack Engineer" but the linked target is
                          "Staff Full-Stack Engineer", and the user
                          finds the latter on their dashboard with no
                          explanation for the rename.
                        */}
                        {!match.is_new && match.matched_target
                          ? match.matched_target.label
                          : suggestion.label}
                      </Text>
                      {!match.is_new && (
                        <Badge variant='default' size='sm'>
                          Existing
                        </Badge>
                      )}
                    </div>
                    <Text
                      variant='caption'
                      className='mt-0.5 text-text-secondary'
                    >
                      {suggestion.description}
                    </Text>
                    {suggestion.core_skills.length > 0 && (
                      <div className='mt-2 flex flex-wrap gap-1.5'>
                        {suggestion.core_skills.map(skill => (
                          <span
                            key={skill}
                            className='rounded-full bg-surface-tertiary px-2.5 py-0.5 text-xs text-text-secondary'
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {error && <Alert variant='error'>{error}</Alert>}

        <div className='flex items-center justify-between'>
          <Button
            name='onboarding-skip-targets'
            variant='ghost'
            size='sm'
            onClick={onSkip}
          >
            Skip for now
          </Button>
          <Button
            name='onboarding-create-targets'
            variant='primary'
            size='sm'
            onClick={handleCreateSelected}
            disabled={creating}
          >
            {creating ? (
              <>
                <Spinner size='sm' aria-label='Creating targets' />
                <span>Creating...</span>
              </>
            ) : selected.size === 0 ? (
              'Continue without targets'
            ) : selected.size === 1 ? (
              'Create 1 target'
            ) : (
              `Create ${selected.size} targets`
            )}
          </Button>
        </div>
      </div>
    );
  }

  // No suggestions (error or empty OptimizedDoc) — fallback to manual prompt
  return (
    <div className='flex flex-col gap-6'>
      <div className='text-center'>
        <Heading variant='cardTitle' as='h2'>
          Set up your job targets
        </Heading>
        <Text variant='caption' className='mt-1 text-text-secondary'>
          Targets define the types of roles you&apos;re looking for. Create one
          to start tracking jobs.
        </Text>
      </div>

      {error && <Alert variant='error'>{error}</Alert>}

      <Card
        padding='lg'
        className='cursor-pointer transition-colors hover:border-brand-500'
        onClick={onComplete}
        role='button'
        tabIndex={0}
        aria-label='Create your first target'
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onComplete();
          }
        }}
      >
        <div className='flex items-center gap-4'>
          <div className='rounded-lg bg-surface-tertiary p-3'>
            <Target className='size-5 text-text-secondary' aria-hidden />
          </div>
          <div className='flex-1'>
            <Text variant='body' className='font-medium'>
              Create your first target
            </Text>
            <Text variant='caption' className='mt-0.5 text-text-secondary'>
              Define a role type, and we&apos;ll score and track matching jobs.
            </Text>
          </div>
        </div>
      </Card>

      <div className='text-center'>
        <Button
          name='onboarding-skip-targets'
          variant='ghost'
          size='sm'
          onClick={onSkip}
        >
          Skip for now
        </Button>
      </div>
    </div>
  );
}
