'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, ChevronDown } from 'lucide-react';
import { Dropdown } from '@danieljoffe.com/shared-ui/Dropdown';
import type { DropdownItem } from '@danieljoffe.com/shared-ui/Dropdown';
import { Input } from '@danieljoffe.com/shared-ui/Input';
import { cn } from '@/lib/cn';
import {
  formatStatus,
  JOB_STATUSES,
  STATUS_DOT_CLASS,
  type JobStatus,
  type JobsFilterState,
  type JobsSortColumn,
} from './types';

const PILL_CLASS =
  'inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-elevated px-3 py-1.5 text-xs text-text-primary hover:bg-surface-secondary';

const MIN_SCORE_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Any score' },
  { value: '40', label: 'Score 40+' },
  { value: '70', label: 'Score 70+' },
  { value: '85', label: 'Score 85+' },
];

const SORT_LABEL: Record<JobsSortColumn, string> = {
  score: 'Score',
  title: 'Title',
  company_name: 'Company',
  created_at: 'Posted',
};

const SORT_COLUMNS: JobsSortColumn[] = [
  'score',
  'title',
  'company_name',
  'created_at',
];

interface JobsFilterProps {
  filters: JobsFilterState;
  onChange: (f: JobsFilterState) => void;
  sort: JobsSortColumn;
  order: 'asc' | 'desc';
  handleSort: (col: JobsSortColumn) => void;
}

export default function JobsFilter({
  filters,
  onChange,
  sort,
  order,
  handleSort,
}: JobsFilterProps) {
  const [searchDraft, setSearchDraft] = useState(filters.search);
  const [excludeLocationsDraft, setExcludeLocationsDraft] = useState(
    filters.excludeLocations
  );
  const [onlyLocationsDraft, setOnlyLocationsDraft] = useState(
    filters.onlyLocations
  );
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    timerRef.current = setTimeout(() => {
      const next = {
        ...filters,
        search: searchDraft,
        excludeLocations: excludeLocationsDraft,
        onlyLocations: onlyLocationsDraft,
      };
      // Skip the call when nothing changed — the debounce fires once per
      // render of this effect so we'd otherwise trigger an extra refetch
      // on every parent re-render.
      if (
        next.search !== filters.search ||
        next.excludeLocations !== filters.excludeLocations ||
        next.onlyLocations !== filters.onlyLocations
      ) {
        onChange(next);
      }
    }, 300);
    return () => clearTimeout(timerRef.current);
  }, [
    searchDraft,
    excludeLocationsDraft,
    onlyLocationsDraft,
    filters,
    onChange,
  ]);

  const minScoreLabel =
    MIN_SCORE_OPTIONS.find(o => o.value === filters.minScore)?.label ??
    'Any score';
  const statusLabel = filters.status
    ? formatStatus(filters.status)
    : 'All statuses';

  const minScoreItems: DropdownItem[] = MIN_SCORE_OPTIONS.map(opt => ({
    label: opt.label,
    onClick: () => onChange({ ...filters, minScore: opt.value }),
    disabled: filters.minScore === opt.value,
  }));

  const statusItems: DropdownItem[] = [
    {
      label: 'All statuses',
      onClick: () => onChange({ ...filters, status: '' }),
      disabled: filters.status === '',
    },
    ...JOB_STATUSES.map<DropdownItem>(s => ({
      label: formatStatus(s),
      icon: (
        <span
          className={cn(
            'inline-block size-2 rounded-full',
            STATUS_DOT_CLASS[s]
          )}
          aria-hidden
        />
      ),
      onClick: () => onChange({ ...filters, status: s }),
      disabled: filters.status === s,
    })),
  ];

  const sortItems: DropdownItem[] = SORT_COLUMNS.map(col => ({
    label: SORT_LABEL[col],
    icon:
      sort === col ? (
        order === 'asc' ? (
          <ArrowUp className='size-4' aria-hidden />
        ) : (
          <ArrowDown className='size-4' aria-hidden />
        )
      ) : undefined,
    onClick: () => handleSort(col),
  }));

  return (
    <div className='flex flex-col gap-2.5'>
      <Input
        size='sm'
        value={searchDraft}
        onChange={e => setSearchDraft(e.target.value)}
        placeholder='Search by title...'
        aria-label='Search by title'
      />
      <div className='flex flex-wrap items-center gap-2'>
        <Dropdown
          trigger={
            <span className={PILL_CLASS}>
              {minScoreLabel}
              <ChevronDown className='size-3 text-text-tertiary' aria-hidden />
            </span>
          }
          items={minScoreItems}
        />
        <Dropdown
          trigger={
            <span className={cn(PILL_CLASS, 'capitalize')}>
              {filters.status && (
                <span
                  className={cn(
                    'inline-block size-2 rounded-full',
                    STATUS_DOT_CLASS[filters.status as JobStatus]
                  )}
                  aria-hidden
                />
              )}
              {statusLabel}
              <ChevronDown className='size-3 text-text-tertiary' aria-hidden />
            </span>
          }
          items={statusItems}
        />
        {/* Sort pill is mobile-only — desktop uses sortable column headers. */}
        <div className='md:hidden'>
          <Dropdown
            trigger={
              <span className={PILL_CLASS}>
                Sort: {SORT_LABEL[sort]} {order === 'asc' ? '↑' : '↓'}
                <ChevronDown
                  className='size-3 text-text-tertiary'
                  aria-hidden
                />
              </span>
            }
            items={sortItems}
            align='right'
          />
        </div>
      </div>
      {/* Location filters — comma-separated free-text. Substring match
          against the job's location field on the API side. Two inputs so
          a user can express "only US-or-Remote" and "never India" in the
          same query. */}
      <div className='grid gap-2 sm:grid-cols-2'>
        <Input
          size='sm'
          value={onlyLocationsDraft}
          onChange={e => setOnlyLocationsDraft(e.target.value)}
          placeholder='Only locations (e.g. Remote, US)'
          aria-label='Only show jobs in locations'
        />
        <Input
          size='sm'
          value={excludeLocationsDraft}
          onChange={e => setExcludeLocationsDraft(e.target.value)}
          placeholder='Exclude locations (e.g. India, Brazil)'
          aria-label='Exclude jobs in locations'
        />
      </div>
    </div>
  );
}
