'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { Heading } from '@danieljoffe.com/shared-ui/Heading';
import { Text } from '@danieljoffe.com/shared-ui/Text';
import { Card, CardContent } from '@danieljoffe.com/shared-ui/Card';
import { Spinner } from '@danieljoffe.com/shared-ui/Spinner';
import Button from '@/components/Button';
import { useToast } from '@/state/Toast/ToastProvider';
import TargetCard from './TargetCard';
import CreateTargetModal from './CreateTargetModal';
import type { JobTarget } from './types';

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
      // Active targets first, then by most recently updated
      targets.sort((a, b) => {
        if (a.is_active !== b.is_active) return a.is_active ? -1 : 1;
        return (
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        );
      });
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
    fetchTargets();
  }, [fetchTargets]);

  if (loading) {
    return (
      <div className='flex items-center justify-center py-20'>
        <Spinner size='lg' aria-label='Loading targets' />
      </div>
    );
  }

  return (
    <div className='flex flex-col gap-6'>
      <div className='flex items-center justify-between'>
        <Heading variant='component' as='h1'>
          Targets
        </Heading>
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

      {targets.length === 0 ? (
        <Card>
          <CardContent className='flex flex-col items-center gap-3 py-12'>
            <Text variant='body' as='p'>
              No targets yet. Create your first target to start scoring jobs
              against a specific role profile.
            </Text>
            <Button
              name='target-create-empty'
              variant='primary'
              size='sm'
              onClick={() => setModalOpen(true)}
            >
              <Plus className='size-4' aria-hidden />
              <span>Create Target</span>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
          {targets.map(target => (
            <TargetCard
              key={target.id}
              target={target}
              onActivate={handleActivate}
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
