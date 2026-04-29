'use client';

import { useCallback, useState } from 'react';
import { Modal } from '@danieljoffe.com/shared-ui/Modal';
import { Input } from '@danieljoffe.com/shared-ui/Input';
import { Textarea } from '@danieljoffe.com/shared-ui/Textarea';
import { Spinner } from '@danieljoffe.com/shared-ui/Spinner';
import { Tabs, type Tab } from '@danieljoffe.com/shared-ui/Tabs';
import { Text } from '@danieljoffe.com/shared-ui/Text';
import Button from '@/components/Button';
import { useToast } from '@/state/Toast/ToastProvider';

type Mode = 'manual' | 'url';

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
  const [mode, setMode] = useState<Mode>('manual');

  // Manual mode
  const [label, setLabel] = useState('');
  const [description, setDescription] = useState('');

  // URL mode
  const [urlLabel, setUrlLabel] = useState('');
  const [jdUrl, setJdUrl] = useState('');

  const [saving, setSaving] = useState(false);
  const [deriving, setDeriving] = useState(false);
  const { toast } = useToast();

  const reset = useCallback(() => {
    setLabel('');
    setDescription('');
    setUrlLabel('');
    setJdUrl('');
    setMode('manual');
    setSaving(false);
    setDeriving(false);
  }, []);

  const busy = saving || deriving;

  const handleClose = useCallback(() => {
    if (busy) return;
    reset();
    onClose();
  }, [busy, reset, onClose]);

  const createTarget = useCallback(
    async (payload: { label: string; description?: string }) => {
      const res = await fetch('/api/targets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(
          (err as Record<string, string> | null)?.detail ??
            'Failed to create target'
        );
      }
      return (await res.json()) as { id: string };
    },
    []
  );

  const handleManualSubmit = useCallback(async () => {
    const trimmedLabel = label.trim();
    if (!trimmedLabel) return;

    setSaving(true);
    try {
      await createTarget({
        label: trimmedLabel,
        ...(description.trim() ? { description: description.trim() } : {}),
      });
      toast({ variant: 'success', title: 'Target created' });
      reset();
      onCreated();
    } catch (e) {
      toast({
        variant: 'error',
        title: e instanceof Error ? e.message : 'Failed to create target',
      });
      setSaving(false);
    }
  }, [label, description, createTarget, toast, reset, onCreated]);

  const handleUrlSubmit = useCallback(async () => {
    const trimmedLabel = urlLabel.trim();
    const trimmedUrl = jdUrl.trim();
    if (!trimmedLabel || !trimmedUrl) return;

    setSaving(true);
    let target: { id: string };
    try {
      target = await createTarget({ label: trimmedLabel });
    } catch (e) {
      toast({
        variant: 'error',
        title: e instanceof Error ? e.message : 'Failed to create target',
      });
      setSaving(false);
      return;
    }

    setDeriving(true);
    try {
      const res = await fetch(`/api/targets/${target.id}/reference-jds`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jd_url: trimmedUrl }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        toast({
          variant: 'warning',
          title:
            (err as Record<string, string> | null)?.detail ??
            'Target created but profile derivation failed. Add a JD later.',
        });
      } else {
        toast({
          variant: 'success',
          title: 'Target created with derived profile',
        });
      }
      reset();
      onCreated();
    } catch {
      toast({
        variant: 'warning',
        title: 'Target created but profile derivation failed',
      });
      reset();
      onCreated();
    }
  }, [urlLabel, jdUrl, createTarget, toast, reset, onCreated]);

  const handleSubmit = useCallback(() => {
    if (mode === 'manual') {
      handleManualSubmit();
    } else {
      handleUrlSubmit();
    }
  }, [mode, handleManualSubmit, handleUrlSubmit]);

  const canSubmit =
    mode === 'manual'
      ? label.trim().length > 0
      : urlLabel.trim().length > 0 && jdUrl.trim().length > 0;

  const tabs: Tab[] = [
    {
      id: 'manual',
      label: 'Manual',
      content: (
        <div className='flex flex-col gap-4 pt-4'>
          <Input
            label='Title'
            placeholder='e.g. Senior Frontend Engineer'
            value={label}
            onChange={e => setLabel(e.target.value)}
            disabled={busy}
            maxLength={200}
          />
          <Textarea
            label='Description (optional)'
            helperText='A short note about this role for your own reference. The scoring profile will be derived later from job descriptions.'
            placeholder='Roles I want to optimize for...'
            value={description}
            onChange={e => setDescription(e.target.value)}
            disabled={busy}
            rows={4}
          />
        </div>
      ),
    },
    {
      id: 'url',
      label: 'From URL',
      content: (
        <div className='flex flex-col gap-4 pt-4'>
          <Input
            label='Title'
            placeholder='e.g. Senior Frontend Engineer'
            value={urlLabel}
            onChange={e => setUrlLabel(e.target.value)}
            disabled={busy}
            maxLength={200}
          />
          <Input
            label='Job description URL'
            helperText="We'll fetch the page and derive a scoring profile from the job description."
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
                Fetching JD and building scoring profile...
              </Text>
            </div>
          )}
        </div>
      ),
    },
  ];

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
            disabled={busy || !canSubmit}
          >
            {busy ? (
              <>
                <Spinner size='sm' />
                <span>{deriving ? 'Analyzing...' : 'Creating...'}</span>
              </>
            ) : (
              'Create Target'
            )}
          </Button>
        </div>
      }
    >
      <Tabs
        tabs={tabs}
        defaultTab='manual'
        variant='underline'
        onChange={id => setMode(id as Mode)}
      />
    </Modal>
  );
}
