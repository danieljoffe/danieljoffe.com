'use client';

import { useCallback, useRef } from 'react';
import { cn } from '@/lib/cn';
import { inputStyles } from '@/lib/formStyles';
import type { JobsFilterState } from './JobsDashboard';

interface JobsFilterProps {
  filters: JobsFilterState;
  onChange: (filters: JobsFilterState) => void;
}

export default function JobsFilter({ filters, onChange }: JobsFilterProps) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const update = useCallback(
    (key: keyof JobsFilterState, value: string) => {
      onChange({ ...filters, [key]: value });
    },
    [filters, onChange]
  );

  const handleSearch = useCallback(
    (value: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        update('search', value);
      }, 300);
    },
    [update]
  );

  return (
    <div className='flex flex-wrap items-end gap-3'>
      <div className='flex flex-col gap-1'>
        <label className='text-xs text-text-secondary'>Min Score</label>
        <input
          type='number'
          min={0}
          max={100}
          value={filters.minScore}
          onChange={e => update('minScore', e.target.value)}
          className={cn(inputStyles, 'w-20')}
        />
      </div>
      <div className='flex flex-col gap-1'>
        <label className='text-xs text-text-secondary'>Status</label>
        <select
          value={filters.status}
          onChange={e => update('status', e.target.value)}
          className={cn(inputStyles, 'w-32')}
        >
          <option value=''>All</option>
          <option value='new'>New</option>
          <option value='saved'>Saved</option>
          <option value='applied'>Applied</option>
          <option value='rejected'>Rejected</option>
          <option value='archived'>Archived</option>
        </select>
      </div>
      <div className='flex flex-col gap-1'>
        <label className='text-xs text-text-secondary'>Search</label>
        <input
          type='text'
          placeholder='Search titles...'
          defaultValue={filters.search}
          onChange={e => handleSearch(e.target.value)}
          className={cn(inputStyles, 'w-48')}
        />
      </div>
    </div>
  );
}
