'use client';

import { useCallback, useState } from 'react';
import { Modal } from '@danieljoffe.com/shared-ui/Modal';
import { Input } from '@danieljoffe.com/shared-ui/Input';
import { Textarea } from '@danieljoffe.com/shared-ui/Textarea';
import { Spinner } from '@danieljoffe.com/shared-ui/Spinner';
import { Text } from '@danieljoffe.com/shared-ui/Text';
import Button from '@/components/Button';
import { useToast } from '@/state/Toast/ToastProvider';

interface CreateTargetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export default function CreateTargetModal({
  isOpen,
  onClose,
  onCreated,
}: CreateTargetModalProps) {
  const [label, setLabel] = useState('');
  const [jdText, setJdText] = useState('');
  const [jdUrl, setJdUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [deriving, setDeriving] = useState(false);
  const { toast } = useToast();

  const reset = useCallback(() => {
    setLabel('');
    setJdText('');
    setJdUrl('');
    setSaving(false);
    setDeriving(false);
  }, []);

  const handleClose = useCallback(() => {
    if (saving || deriving) return;
    reset();
    onClose();
  }, [saving, deriving, reset, onClose]);

  const handleSubmit = useCallback(async () => {
    const trimmedLabel = label.trim();
    if (!trimmedLabel) return;

    setSaving(true);

    try {
      // Create the target
      const createRes = await fetch('/api/targets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: trimmedLabel }),
      });

      if (!createRes.ok) {
        const err = await createRes.json().catch(() => null);
        toast({
          variant: 'error',
          title:
            (err as Record<string, string> | null)?.detail ??
            'Failed to create target',
        });
        setSaving(false);
        return;
      }

      const target = (await createRes.json()) as { id: string };

      // If JD text provided, add as reference JD (triggers LLM derivation)
      const trimmedJd = jdText.trim();
      if (trimmedJd.length >= 50) {
        setDeriving(true);

        const jdRes = await fetch(`/api/targets/${target.id}/reference-jds`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jd_text: trimmedJd,
            ...(jdUrl.trim() ? { jd_url: jdUrl.trim() } : {}),
          }),
        });

        if (!jdRes.ok) {
          toast({
            variant: 'warning',
            title:
              'Target created but profile derivation failed. Add a reference JD later.',
          });
        } else {
          toast({
            variant: 'success',
            title: 'Target created with derived profile',
          });
        }
      } else {
        toast({ variant: 'success', title: 'Target created' });
      }

      reset();
      onCreated();
    } catch {
      toast({ variant: 'error', title: 'Network error creating target' });
      setSaving(false);
      setDeriving(false);
    }
  }, [label, jdText, jdUrl, toast, reset, onCreated]);

  const busy = saving || deriving;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title='New Target'
      size='lg'
      closeOnBackdropClick={!busy}
      footer={
        <div className='flex justify-end gap-2'>
          <Button
            name='target-create-cancel'
            variant='outline'
            size='sm'
            onClick={handleClose}
            disabled={busy}
          >
            Cancel
          </Button>
          <Button
            name='target-create-submit'
            variant='primary'
            size='sm'
            onClick={handleSubmit}
            disabled={busy || !label.trim()}
          >
            {busy ? (
              <>
                <Spinner size='sm' />
                <span>{deriving ? 'Analyzing...' : 'Creating...'}</span>
              </>
            ) : (
              'Create'
            )}
          </Button>
        </div>
      }
    >
      <div className='flex flex-col gap-4'>
        <Input
          label='Label'
          placeholder='e.g. Senior Frontend Engineer'
          value={label}
          onChange={e => setLabel(e.target.value)}
          disabled={busy}
          maxLength={200}
        />

        <Textarea
          label='Job description (optional)'
          helperText='Paste a job description to automatically derive a scoring profile. Minimum 50 characters.'
          placeholder='Paste the full job description here...'
          value={jdText}
          onChange={e => setJdText(e.target.value)}
          disabled={busy}
          rows={8}
        />

        <Input
          label='JD source URL (optional)'
          placeholder='https://...'
          value={jdUrl}
          onChange={e => setJdUrl(e.target.value)}
          disabled={busy}
          type='url'
        />

        {deriving && (
          <div className='flex items-center gap-2 rounded-lg bg-surface-secondary p-3'>
            <Spinner size='sm' />
            <Text variant='caption' as='span'>
              Analyzing job description and building scoring profile...
            </Text>
          </div>
        )}
      </div>
    </Modal>
  );
}
