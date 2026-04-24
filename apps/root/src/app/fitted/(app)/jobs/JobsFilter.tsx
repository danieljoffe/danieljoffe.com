'use client';

import { useEffect, useRef, useState } from 'react';
import { Input } from '@danieljoffe.com/shared-ui/Input';
import { Select } from '@danieljoffe.com/shared-ui/Select';
import { JOB_STATUSES, type JobsFilterState } from './types';

interface JobsFilterProps {
  filters: JobsFilterState;
  onChange: (f: JobsFilterState) => void;
}

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  ...JOB_STATUSES.map(s => ({ value: s, label: s.replace('_', ' ') })),
];

export default function JobsFilter({ filters, onChange }: JobsFilterProps) {
  const [searchDraft, setSearchDraft] = useState(filters.search);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    timerRef.current = setTimeout(() => {
      if (searchDraft !== filters.search) {
        onChange({ ...filters, search: searchDraft });
      }
    }, 300);
    return () => clearTimeout(timerRef.current);
  }, [searchDraft, filters, onChange]);

  return (
    <div className='flex flex-wrap items-end gap-3'>
      <div className='w-28'>
        <Input
          label='Min score'
          type='number'
          size='sm'
          min={0}
          max={100}
          value={filters.minScore}
          onChange={e => onChange({ ...filters, minScore: e.target.value })}
          placeholder='0'
        />
      </div>
      <div className='w-40'>
        <Select
          label='Status'
          size='sm'
          options={STATUS_OPTIONS}
          value={filters.status}
          onChange={e => onChange({ ...filters, status: e.target.value })}
        />
      </div>
      <div className='flex-1 min-w-[200px]'>
        <Input
          label='Search'
          size='sm'
          value={searchDraft}
          onChange={e => setSearchDraft(e.target.value)}
          placeholder='Search by title...'
        />
      </div>
    </div>
  );
}
