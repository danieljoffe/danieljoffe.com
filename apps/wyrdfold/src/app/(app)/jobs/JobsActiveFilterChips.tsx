'use client';

import { X } from 'lucide-react';
import { cn } from '@/lib/cn';
import {
  formatStatus,
  STATUS_DOT_CLASS,
  type JobStatus,
  type JobsFilterState,
} from './types';

const SCORE_LABEL: Record<string, string> = {
  '40': 'Score 40+',
  '70': 'Score 70+',
  '85': 'Score 85+',
};

const CHIP_CLASS =
  'inline-flex items-center gap-1 rounded-full border border-brand-500/40 bg-brand-500/10 py-0.5 pl-2.5 pr-1 text-xs text-text-primary';

const REMOVE_BTN_CLASS =
  'flex size-4 items-center justify-center rounded-full text-text-tertiary hover:bg-brand-500/20 hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500';

interface JobsActiveFilterChipsProps {
  filters: JobsFilterState;
  onChange: (next: JobsFilterState) => void;
}

export default function JobsActiveFilterChips({
  filters,
  onChange,
}: JobsActiveFilterChipsProps) {
  const chips: { key: string; label: React.ReactNode; onRemove: () => void }[] =
    [];

  if (filters.search) {
    chips.push({
      key: 'search',
      label: `Search: "${filters.search}"`,
      onRemove: () => onChange({ ...filters, search: '' }),
    });
  }

  if (filters.minScore) {
    chips.push({
      key: 'minScore',
      label: SCORE_LABEL[filters.minScore] ?? `Score ${filters.minScore}+`,
      onRemove: () => onChange({ ...filters, minScore: '' }),
    });
  }

  if (filters.status) {
    chips.push({
      key: 'status',
      label: (
        <span className='inline-flex items-center gap-1.5 capitalize'>
          <span
            className={cn(
              'inline-block size-2 rounded-full',
              STATUS_DOT_CLASS[filters.status as JobStatus]
            )}
            aria-hidden
          />
          {formatStatus(filters.status)}
        </span>
      ),
      onRemove: () => onChange({ ...filters, status: '' }),
    });
  }

  if (filters.onlyLocations) {
    chips.push({
      key: 'onlyLocations',
      label: `Only: ${filters.onlyLocations}`,
      onRemove: () => onChange({ ...filters, onlyLocations: '' }),
    });
  }

  if (filters.excludeLocations) {
    chips.push({
      key: 'excludeLocations',
      label: `Exclude: ${filters.excludeLocations}`,
      onRemove: () => onChange({ ...filters, excludeLocations: '' }),
    });
  }

  if (chips.length === 0) return null;

  const clearAll = () =>
    onChange({
      search: '',
      minScore: '',
      status: '',
      onlyLocations: '',
      excludeLocations: '',
    });

  return (
    <div
      className='flex flex-wrap items-center gap-1.5'
      role='region'
      aria-label='Active filters'
    >
      {chips.map(chip => (
        <span key={chip.key} className={CHIP_CLASS}>
          {chip.label}
          <button
            type='button'
            onClick={chip.onRemove}
            aria-label={`Remove ${chip.key} filter`}
            className={REMOVE_BTN_CLASS}
          >
            <X className='size-3' aria-hidden />
          </button>
        </span>
      ))}
      {chips.length > 1 && (
        <button
          type='button'
          onClick={clearAll}
          className='ml-1 text-xs text-text-secondary underline-offset-2 hover:text-text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded'
        >
          Clear all
        </button>
      )}
    </div>
  );
}
