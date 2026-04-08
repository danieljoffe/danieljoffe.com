'use client';

import { useCallback, useState } from 'react';
import { Heading } from '@danieljoffe.com/shared-ui/Heading';
import { Text } from '@danieljoffe.com/shared-ui/Text';
import {
  FOCUS_RING,
  FOCUS_RING_OFFSET,
} from '@danieljoffe.com/shared-ui/styles/formStyles';
import Button from '@/components/Button';
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
  const [activeTab, setActiveTab] = useState<'scans' | 'leads'>('scans');

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

  const tabs = [
    { id: 'scans' as const, label: 'Scans' },
    { id: 'leads' as const, label: 'Leads' },
  ];

  return (
    <div className='max-w-3xl mx-auto w-full px-4 sm:px-6'>
      <div className='flex flex-col gap-6 py-8'>
        <div className='flex flex-row justify-between items-start'>
          <Heading variant='section' as='h1'>
            Audit Admin
          </Heading>
          <Button
            variant='bare'
            name='admin-sign-out'
            className='text-sm text-text-secondary hover:text-text-primary'
            onClick={() => setPassword(null)}
          >
            Sign out
          </Button>
        </div>

        {statsError ? (
          <Text variant='error'>{statsError}</Text>
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
                className='h-24 rounded-lg bg-surface-elevated animate-pulse'
              />
            ))}
          </div>
        )}

        <div className='w-full'>
          <div className='border-b border-border'>
            <div role='tablist' className='flex gap-1 flex-wrap'>
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  role='tab'
                  aria-selected={activeTab === tab.id}
                  className={`px-4 py-2.5 border-b-2 transition-colors ${FOCUS_RING} ${FOCUS_RING_OFFSET} ${
                    activeTab === tab.id
                      ? 'border-brand-500 text-brand-500'
                      : 'border-transparent text-text-secondary hover:text-text-primary hover:border-border-secondary'
                  }`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
          <div role='tabpanel' className='mt-4'>
            {activeTab === 'scans' ? (
              <ScansTable password={password} />
            ) : (
              <LeadsTable password={password} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
