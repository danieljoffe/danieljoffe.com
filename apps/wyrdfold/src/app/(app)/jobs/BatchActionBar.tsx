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
      // Mobile: span the viewport width with edge padding and stack
      // status + actions vertically so buttons don't overflow.
      // Desktop: shrink-to-content, centered, single row.
      className='fixed bottom-[calc(3.5rem+env(safe-area-inset-bottom,0px)+0.75rem)] left-3 right-3 z-50 flex flex-col gap-2 rounded-xl border border-border bg-surface px-3 py-2.5 shadow-lg md:bottom-4 md:left-1/2 md:right-auto md:-translate-x-1/2 md:flex-row md:items-center md:gap-3 md:px-4 md:py-3'
    >
      <div className='flex flex-wrap items-center gap-x-3 gap-y-1'>
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
      </div>
      <div className='flex flex-wrap items-center gap-2 md:gap-3'>
        <Button
          name='batch-deselect'
          variant='outline'
          size='sm'
          onClick={onClear}
        >
          Deselect
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
            {exporting ? 'Exporting...' : 'Export (.zip)'}
          </Button>
        )}
        <Button
          name='batch-delete'
          variant='error'
          size='sm'
          onClick={onBatchDelete}
        >
          Delete
        </Button>
      </div>
    </div>
  );
}
