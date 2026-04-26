'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Sparkles } from 'lucide-react';
import { Badge } from '@danieljoffe.com/shared-ui/Badge';
import { Heading } from '@danieljoffe.com/shared-ui/Heading';
import { Spinner } from '@danieljoffe.com/shared-ui/Spinner';
import { Text } from '@danieljoffe.com/shared-ui/Text';
import { Card, CardContent } from '@danieljoffe.com/shared-ui/Card';
import { Skeleton } from '@danieljoffe.com/shared-ui/Skeleton';
import Button from '@/components/Button';
import { useToast } from '@/state/Toast/ToastProvider';
import TargetCard from './TargetCard';
import CreateTargetModal from './CreateTargetModal';
import type { JobTarget } from './types';

interface Suggestion {
  label: string;
  description: string;
  core_skills: string[];
}

export default function TargetsList() {
  const [targets, setTargets] = useState<JobTarget[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const fetchTargets = useCallback(async () => {
    try {
      const res = await fetch('/api/targets');
      if (!res.ok) throw new Error('Failed to fetch targets');
      const { targets } = (await res.json()) as { targets: JobTarget[] };
      setTargets(targets);
    } catch {
      toast({ variant: 'error', title: 'Failed to load targets' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchTargets();
  }, [fetchTargets]);

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
      router.push(`/fitted/jobs?target=${id}`);
    },
    [router]
  );

  const handleCreated = useCallback(() => {
    setModalOpen(false);
    setSuggestions([]);
    fetchTargets();
  }, [fetchTargets]);

  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [suggesting, setSuggesting] = useState(false);
  const [creatingSuggestion, setCreatingSuggestion] = useState<string | null>(
    null
  );

  const handleSuggest = useCallback(async () => {
    setSuggesting(true);
    setSuggestions([]);
    try {
      const res = await fetch('/api/targets/suggest', { method: 'POST' });
      if (!res.ok) throw new Error('Suggest failed');
      const data = (await res.json()) as { suggestions: Suggestion[] };
      setSuggestions(data.suggestions);
    } catch {
      toast({ variant: 'error', title: 'Failed to generate suggestions' });
    } finally {
      setSuggesting(false);
    }
  }, [toast]);

  const handleCreateFromSuggestion = useCallback(
    async (suggestion: Suggestion) => {
      setCreatingSuggestion(suggestion.label);
      try {
        const res = await fetch('/api/targets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ label: suggestion.label }),
        });
        if (!res.ok) throw new Error('Create failed');
        toast({
          variant: 'success',
          title: `Target "${suggestion.label}" created`,
        });
        setSuggestions(prev => prev.filter(s => s.label !== suggestion.label));
        fetchTargets();
      } catch {
        toast({ variant: 'error', title: 'Failed to create target' });
      } finally {
        setCreatingSuggestion(null);
      }
    },
    [toast, fetchTargets]
  );

  if (loading) {
    return (
      <div className='flex flex-col gap-6' aria-label='Loading targets'>
        <div className='flex items-center justify-between'>
          <Skeleton width={120} height={28} />
          <Skeleton variant='rectangular' width={110} height={36} />
        </div>
        <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} padding='none'>
              <CardContent className='p-4 flex flex-col gap-3'>
                <Skeleton width='70%' size='lg' />
                <div className='flex gap-4'>
                  <Skeleton width={90} size='sm' />
                  <Skeleton width={80} size='sm' />
                </div>
                <Skeleton width={130} size='sm' />
                <div className='flex gap-2 pt-1'>
                  <Skeleton variant='rectangular' width={80} height={32} />
                  <Skeleton variant='rectangular' width={80} height={32} />
                  <Skeleton variant='rectangular' width={60} height={32} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className='flex flex-col gap-6'>
      <div className='flex items-center justify-between'>
        <Heading variant='component' as='h1'>
          Targets
        </Heading>
        <div className='flex items-center gap-2'>
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
                <span>Suggest</span>
              </>
            )}
          </Button>
          <Button
            name='target-create'
            variant='primary'
            size='sm'
            onClick={() => setModalOpen(true)}
          >
            <Plus className='size-4' aria-hidden />
            <span>New Target</span>
          </Button>
        </div>
      </div>

      {/* AI Suggestions */}
      {suggestions.length > 0 && (
        <div className='flex flex-col gap-3'>
          <Text variant='caption'>Suggested targets from your experience</Text>
          <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-3'>
            {suggestions.map(s => (
              <Card key={s.label} padding='none'>
                <CardContent className='p-4 flex flex-col gap-2'>
                  <Text variant='body' className='font-medium'>
                    {s.label}
                  </Text>
                  <Text variant='caption' className='text-text-secondary'>
                    {s.description}
                  </Text>
                  {s.core_skills.length > 0 && (
                    <div className='flex flex-wrap gap-1'>
                      {s.core_skills.map(skill => (
                        <Badge key={skill} variant='default' size='sm'>
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <Button
                    name={`create-suggestion-${s.label}`}
                    variant='primary'
                    size='sm'
                    onClick={() => handleCreateFromSuggestion(s)}
                    disabled={creatingSuggestion === s.label}
                    className='mt-1 self-start'
                  >
                    {creatingSuggestion === s.label
                      ? 'Creating...'
                      : 'Create Target'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {targets.length === 0 ? (
        <Card>
          <CardContent className='flex flex-col items-center gap-3 py-12'>
            <Text variant='body' as='p'>
              No targets yet. Create your first target to start scoring jobs
              against a specific role profile.
            </Text>
            <div className='flex items-center gap-3'>
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
        <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
          {targets.map(target => (
            <TargetCard
              key={target.id}
              target={target}
              onActivate={handleActivate}
              onDeactivate={handleDeactivate}
              onDelete={handleDelete}
              onViewJobs={handleViewJobs}
            />
          ))}
        </div>
      )}

      <CreateTargetModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={handleCreated}
      />
    </div>
  );
}
