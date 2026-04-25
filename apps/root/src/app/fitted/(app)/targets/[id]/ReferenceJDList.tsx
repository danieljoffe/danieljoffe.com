'use client';

import { useCallback, useState } from 'react';
import { ExternalLink, Trash2 } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@danieljoffe.com/shared-ui/Card';
import { Text } from '@danieljoffe.com/shared-ui/Text';
import Button from '@/components/Button';
import { useToast } from '@/state/Toast/ToastProvider';
import type { TargetReferenceJD } from '../types';
import AddReferenceJDModal from './AddReferenceJDModal';

interface ReferenceJDListProps {
  targetId: string;
  referenceJDs: TargetReferenceJD[];
  onChanged: () => void;
}

export default function ReferenceJDList({
  targetId,
  referenceJDs,
  onChanged,
}: ReferenceJDListProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { toast } = useToast();

  const handleDelete = useCallback(
    async (refId: string) => {
      /* eslint-disable no-alert -- personal tool */
      if (
        !window.confirm(
          'Delete this reference JD? The scoring profile will be re-merged.'
        )
      )
        return;
      /* eslint-enable no-alert */

      setDeletingId(refId);
      try {
        const res = await fetch(
          `/api/targets/${targetId}/reference-jds/${refId}`,
          { method: 'DELETE' }
        );
        if (!res.ok) throw new Error('Delete failed');
        toast({ variant: 'success', title: 'Reference JD removed' });
        onChanged();
      } catch {
        toast({ variant: 'error', title: 'Failed to delete reference JD' });
      } finally {
        setDeletingId(null);
      }
    },
    [targetId, toast, onChanged]
  );

  const handleAdded = useCallback(() => {
    setModalOpen(false);
    onChanged();
  }, [onChanged]);

  return (
    <Card>
      <CardHeader>
        <div className='flex items-center justify-between'>
          <CardTitle>Reference JDs ({referenceJDs.length})</CardTitle>
          <Button
            name='target-ref-jd-add'
            variant='outline'
            size='sm'
            onClick={() => setModalOpen(true)}
          >
            Add Reference JD
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {referenceJDs.length === 0 ? (
          <Text variant='body' as='p' className='text-text-secondary'>
            No reference JDs yet. Add one to automatically derive a scoring
            profile from a job description.
          </Text>
        ) : (
          <div className='flex flex-col gap-3'>
            {referenceJDs.map(jd => (
              <div
                key={jd.id}
                className='flex items-start justify-between gap-3 rounded-lg border border-border p-3'
              >
                <div className='flex flex-col gap-1 min-w-0'>
                  {jd.jd_url && (
                    <a
                      href={jd.jd_url}
                      target='_blank'
                      rel='noopener noreferrer'
                      className='flex items-center gap-1 text-xs text-brand-500 hover:underline'
                    >
                      <ExternalLink className='size-3 shrink-0' aria-hidden />
                      <span className='truncate'>{jd.jd_url}</span>
                    </a>
                  )}
                  <Text variant='caption' as='p' className='line-clamp-2'>
                    {jd.jd_text}
                  </Text>
                  <Text variant='meta' as='span'>
                    Added {new Date(jd.created_at).toLocaleDateString()}
                  </Text>
                </div>
                <Button
                  name={`target-ref-jd-delete-${jd.id}`}
                  variant='bare'
                  size='sm'
                  iconOnly
                  onClick={() => handleDelete(jd.id)}
                  disabled={deletingId === jd.id}
                  aria-label='Delete reference JD'
                  className='text-text-tertiary hover:text-error shrink-0'
                >
                  <Trash2 className='size-3.5' />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <AddReferenceJDModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        targetId={targetId}
        onAdded={handleAdded}
      />
    </Card>
  );
}
