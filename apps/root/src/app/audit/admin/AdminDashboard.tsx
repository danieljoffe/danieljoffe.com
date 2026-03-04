'use client';

import { useCallback, useState } from 'react';
import { PageContainer, Stack, Tabs } from '@danieljoffe.com/shared-ui';
import PasswordGate from './PasswordGate';
import StatsRow from './StatsRow';
import ScansTable from './ScansTable';
import LeadsTable from './LeadsTable';

interface Stats {
  totalScans: number;
  scansToday: number;
  totalLeads: number;
  conversionRate: number;
}

export default function AdminDashboard() {
  const [password, setPassword] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [statsError, setStatsError] = useState('');

  const fetchStats = useCallback(async (pw: string) => {
    try {
      const res = await fetch('/api/audit/admin/stats', {
        headers: { 'x-admin-password': pw },
      });
      if (res.ok) {
        setStats(await res.json());
      } else {
        setStatsError('Failed to load stats');
      }
    } catch {
      setStatsError('Failed to load stats');
    }
  }, []);

  function handleAuthenticated(pw: string) {
    setPassword(pw);
    fetchStats(pw);
  }

  if (!password) {
    return <PasswordGate onAuthenticated={handleAuthenticated} />;
  }

  return (
    <PageContainer>
      <Stack direction='vertical' gap='lg' className='py-8'>
        <Stack direction='horizontal' justify='between' align='start'>
          <h1 className='text-2xl font-bold'>Audit Admin</h1>
          <button
            className='text-sm text-foreground-muted hover:text-foreground'
            onClick={() => setPassword(null)}
          >
            Sign out
          </button>
        </Stack>

        {statsError ? (
          <p className='text-error text-sm'>{statsError}</p>
        ) : stats ? (
          <StatsRow
            stats={[
              { label: 'Total Scans', value: stats.totalScans },
              { label: 'Scans Today', value: stats.scansToday },
              { label: 'Total Leads', value: stats.totalLeads },
              {
                label: 'Conversion Rate',
                value: `${stats.conversionRate}%`,
                subtitle: 'leads / completed scans',
              },
            ]}
          />
        ) : (
          <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className='h-24 rounded-lg bg-background-elevated animate-pulse'
              />
            ))}
          </div>
        )}

        <Tabs
          tabs={[
            {
              id: 'scans',
              label: 'Scans',
              content: <ScansTable password={password} />,
            },
            {
              id: 'leads',
              label: 'Leads',
              content: <LeadsTable password={password} />,
            },
          ]}
          defaultTab='scans'
        />
      </Stack>
    </PageContainer>
  );
}
