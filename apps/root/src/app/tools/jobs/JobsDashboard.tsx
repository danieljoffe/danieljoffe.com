'use client';

import { useState } from 'react';
import { Heading } from '@danieljoffe.com/shared-ui/Heading';
import { Tabs } from '@danieljoffe.com/shared-ui/Tabs';
import PasswordGate from '@/app/audit/admin/PasswordGate';
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
  const [password, setPassword] = useState('');
  const [filters, setFilters] = useState<JobsFilterState>(INITIAL_FILTERS);
  const [refreshKey, setRefreshKey] = useState(0);

  if (!password) {
    return (
      <PasswordGate
        onAuthenticated={setPassword}
        verifyEndpoint='/api/jobs/verify'
        title='Job Search'
      />
    );
  }

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
            <ScanButton
              password={password}
              onComplete={() => setRefreshKey(k => k + 1)}
            />
          </div>
          <JobsFilter filters={filters} onChange={setFilters} />
          <JobsTable
            password={password}
            filters={filters}
            refreshKey={refreshKey}
          />
        </div>
      ),
    },
    {
      id: 'sources',
      label: 'Sources',
      content: <SourcesPanel password={password} />,
    },
  ];

  return <Tabs tabs={tabs} />;
}
