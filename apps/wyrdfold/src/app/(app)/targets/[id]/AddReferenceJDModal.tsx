'use client';

import { useCallback, useState } from 'react';
import { Modal } from '@danieljoffe.com/shared-ui/Modal';
import { Textarea } from '@danieljoffe.com/shared-ui/Textarea';
import { Input } from '@danieljoffe.com/shared-ui/Input';
import { Spinner } from '@danieljoffe.com/shared-ui/Spinner';
import { Text } from '@danieljoffe.com/shared-ui/Text';
import Button from '@/components/Button';
import { extractApiError } from '@/lib/extractApiError';
import { useToast } from '@/state/Toast/ToastProvider';

interface AddReferenceJDModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetId: string;
  onAdded: () => void;
}

export default function AddReferenceJDModal({
  isOpen,
  onClose,
  targetId,
  onAdded,
}: AddReferenceJDModalProps) {
  const [jdText, setJdText] = useState('');
  const [jdUrl, setJdUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const reset = useCallback(() => {
    setJdText('');
    setJdUrl('');
    setSaving(false);
  }, []);

  const handleClose = useCallback(() => {
    if (saving) return;
    reset();
    onClose();
  }, [saving, reset, onClose]);

  const trimmedText = jdText.trim();
  const isValid = trimmedText.length >= 50;

  const handleSubmit = useCallback(async () => {
    if (!isValid) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/targets/${targetId}/reference-jds`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jd_text: trimmedText,
          ...(jdUrl.trim() ? { jd_url: jdUrl.trim() } : {}),
        }),
      });

      if (!res.ok) {
        toast({
          variant: 'error',
          title: await extractApiError(res, 'Failed to add reference JD'),
        });
        setSaving(false);
        return;
      }

      toast({
        variant: 'success',
        title: 'Reference JD added and profile updated',
      });
      reset();
      onAdded();
    } catch {
      toast({ variant: 'error', title: 'Network error adding reference JD' });
      setSaving(false);
    }
  }, [targetId, trimmedText, jdUrl, isValid, toast, reset, onAdded]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title='Add Reference JD'
      size='lg'
      closeOnBackdropClick={!saving}
      footer={
        <div className='flex justify-end gap-2'>
          <Button
            name='target-ref-jd-cancel'
            variant='outline'
            size='sm'
            onClick={handleClose}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            name='target-ref-jd-submit'
            variant='primary'
            size='sm'
            onClick={handleSubmit}
            disabled={saving || !isValid}
          >
            {saving ? (
              <>
                <Spinner size='sm' />
                <span>Analyzing...</span>
              </>
            ) : (
              'Add'
            )}
          </Button>
        </div>
      }
    >
      <div className='flex flex-col gap-4'>
        <Textarea
          label='Job description text'
          helperText={`Paste the full JD. Minimum 50 characters (${trimmedText.length}/50).`}
          placeholder='Paste the full job description here...'
          value={jdText}
          onChange={e => setJdText(e.target.value)}
          disabled={saving}
          rows={10}
          error={
            trimmedText.length > 0 && trimmedText.length < 50
              ? 'Minimum 50 characters required'
              : undefined
          }
        />

        <Input
          label='Source URL (optional)'
          placeholder='https://...'
          value={jdUrl}
          onChange={e => setJdUrl(e.target.value)}
          disabled={saving}
          type='url'
        />

        {saving && (
          <div className='flex items-center gap-2 rounded-lg bg-surface-secondary p-3'>
            <Spinner size='sm' />
            <Text variant='caption' as='span'>
              Analyzing job description and merging into scoring profile...
            </Text>
          </div>
        )}
      </div>
    </Modal>
  );
}
