'use client';

import Button from '@/components/Button';

interface BatchActionBarProps {
  selectedCount: number;
  onClear: () => void;
  onBatchGenerate: () => void;
  onBatchDelete: () => void;
  onBatchExport: () => void;
  generating: boolean;
  exporting: boolean;
  hasApproved: boolean;
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
}: BatchActionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div
      role='status'
      aria-live='polite'
      className='fixed bottom-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 shadow-lg'
    >
      <span className='text-sm font-medium text-text-primary'>
        {selectedCount} selected
      </span>
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
        disabled={generating}
      >
        {generating ? 'Generating...' : 'Generate resumes'}
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
