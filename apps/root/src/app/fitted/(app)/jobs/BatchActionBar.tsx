'use client';

import { Text } from '@danieljoffe.com/shared-ui/Text';
import Button from '@/components/Button';

const BATCH_WARN_THRESHOLD = 5;
const BATCH_MAX = 20;

interface BatchActionBarProps {
  selectedCount: number;
  onClear: () => void;
  onBatchGenerate: () => void;
  onBatchDelete: () => void;
  onBatchExport: () => void;
  generating: boolean;
  exporting: boolean;
  hasApproved: boolean;
  /** F3-B: live counter shown while a batch is processing (n of N completed). */
  batchProgress?: { completed: number; total: number } | undefined;
}

export default function BatchActionBar({
  selectedCount,
  onClear,
  onBatchGenerate,
  onBatchDelete,
  onBatchExport,
  generating,
  exporting,
  hasApproved,
  batchProgress,
}: BatchActionBarProps) {
  if (selectedCount === 0) return null;

  const overMax = selectedCount > BATCH_MAX;
  const showWarning = selectedCount > BATCH_WARN_THRESHOLD;
  const generatingLabel =
    generating && batchProgress
      ? `Generating ${batchProgress.completed} of ${batchProgress.total}…`
      : generating
        ? 'Generating…'
        : 'Generate resumes';

  return (
    <div
      role='status'
      aria-live='polite'
      className='fixed bottom-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 shadow-lg'
    >
      <span className='text-sm font-medium text-text-primary'>
        {selectedCount} selected
      </span>
      {showWarning && (
        <Text variant='meta' className='text-warning'>
          {overMax
            ? `Max ${BATCH_MAX} per batch`
            : 'Large batch — may take a while'}
        </Text>
      )}
      <Button
        name='batch-deselect'
        variant='outline'
        size='sm'
        onClick={onClear}
      >
        Deselect all
      </Button>
      <Button
        name='batch-generate'
        variant='primary'
        size='sm'
        onClick={onBatchGenerate}
        disabled={generating || overMax}
      >
        {generatingLabel}
      </Button>
      {hasApproved && (
        <Button
          name='batch-export'
          variant='secondary'
          size='sm'
          onClick={onBatchExport}
          disabled={exporting}
        >
          {exporting ? 'Exporting...' : 'Export approved (.zip)'}
        </Button>
      )}
      <Button
        name='batch-delete'
        variant='error'
        size='sm'
        onClick={onBatchDelete}
      >
        Delete selected
      </Button>
    </div>
  );
}
