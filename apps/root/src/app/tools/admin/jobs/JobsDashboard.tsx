'use client';

import { useState } from 'react';
import { Heading } from '@danieljoffe.com/shared-ui/Heading';
import { Tabs } from '@danieljoffe.com/shared-ui/Tabs';
import JobsTable from './JobsTable';
import JobsFilter from './JobsFilter';
import ScanButton from './ScanButton';
import SourcesPanel from './SourcesPanel';

export interface JobsFilterState {
  minScore: string;
  status: string;
  company: string;
  search: string;
}

const INITIAL_FILTERS: JobsFilterState = {
  minScore: '30',
  status: '',
  company: '',
  search: '',
};

export default function JobsDashboard() {
  const [filters, setFilters] = useState<JobsFilterState>(INITIAL_FILTERS);
  const [refreshKey, setRefreshKey] = useState(0);

  const tabs = [
    {
      id: 'jobs',
      label: 'Jobs',
      content: (
        <div className='space-y-4'>
          <div className='flex items-center justify-between'>
            <Heading variant='section' as='h1'>
              Job Search
            </Heading>
            <ScanButton onComplete={() => setRefreshKey(k => k + 1)} />
          </div>
          <JobsFilter filters={filters} onChange={setFilters} />
          <JobsTable filters={filters} refreshKey={refreshKey} />
        </div>
      ),
    },
    {
      id: 'sources',
      label: 'Sources',
      content: <SourcesPanel />,
    },
  ];

  return <Tabs tabs={tabs} />;
}
