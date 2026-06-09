'use client';

import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import dynamic from 'next/dynamic';
import { Heading } from '@danieljoffe/shared-ui/Heading';
import { Text } from '@danieljoffe/shared-ui/Text';
import {
  FOCUS_RING,
  FOCUS_RING_OFFSET,
} from '@danieljoffe/shared-ui/styles/formStyles';
import StatsRow from './StatsRow';
import ScansTable from './ScansTable';
import LeadsTable from './LeadsTable';

const ScansOverTimeCard = dynamic(() => import('./charts/ScansOverTimeCard'));
const ScoreDistributionCard = dynamic(
  () => import('./charts/ScoreDistributionCard')
);
const LeadSourcesCard = dynamic(() => import('./charts/LeadSourcesCard'));

interface Stats {
  totalScans: number;
  scansToday: number;
  totalLeads: number;
  conversionRate: number;
}

type TabId = 'scans' | 'leads';

const TABS: { id: TabId; label: string }[] = [
  { id: 'scans', label: 'Scans' },
  { id: 'leads', label: 'Leads' },
];

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [statsError, setStatsError] = useState('');
  const [activeTab, setActiveTab] = useState<TabId>('scans');
  const tabRefs = useRef<Record<TabId, HTMLButtonElement | null>>({
    scans: null,
    leads: null,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/audit/admin/stats');
        if (!res.ok) {
          if (!cancelled) setStatsError('Failed to load stats');
          return;
        }
        const data = await res.json();
        if (!cancelled) setStats(data);
      } catch {
        if (!cancelled) setStatsError('Failed to load stats');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleTabKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    index: number
  ) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    event.preventDefault();
    const delta = event.key === 'ArrowRight' ? 1 : -1;
    const nextIndex = (index + delta + TABS.length) % TABS.length;
    const nextTab = TABS[nextIndex];
    if (!nextTab) return;
    setActiveTab(nextTab.id);
    tabRefs.current[nextTab.id]?.focus();
  };

  return (
    <div className='max-w-6xl mx-auto w-full px-4 sm:px-6'>
      <div className='flex flex-col gap-6 py-8'>
        <Heading variant='section' as='h1'>
          Audit Admin
        </Heading>

        {statsError ? (
          <Text variant='error' role='alert'>
            {statsError}
          </Text>
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
          <div
            role='status'
            aria-label='Loading stats'
            className='grid grid-cols-2 md:grid-cols-4 gap-4'
          >
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className='h-24 rounded-lg bg-surface-elevated animate-pulse'
              />
            ))}
          </div>
        )}

        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
          <ScansOverTimeCard />
          <ScoreDistributionCard />
          <LeadSourcesCard />
        </div>

        <div className='w-full'>
          <div className='border-b border-border'>
            <div role='tablist' className='flex gap-1 flex-wrap'>
              {TABS.map((tab, index) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    id={`admin-tab-${tab.id}`}
                    role='tab'
                    aria-selected={isActive}
                    aria-controls={`admin-tabpanel-${tab.id}`}
                    tabIndex={isActive ? 0 : -1}
                    ref={el => {
                      tabRefs.current[tab.id] = el;
                    }}
                    className={`px-4 py-2.5 border-b-2 transition-colors ${FOCUS_RING} ${FOCUS_RING_OFFSET} ${
                      isActive
                        ? 'border-brand-500 text-brand-500'
                        : 'border-transparent text-text-secondary hover:text-text-primary hover:border-border-secondary'
                    }`}
                    onClick={() => setActiveTab(tab.id)}
                    onKeyDown={event => handleTabKeyDown(event, index)}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div
            role='tabpanel'
            id={`admin-tabpanel-${activeTab}`}
            aria-labelledby={`admin-tab-${activeTab}`}
            tabIndex={0}
            className={`mt-4 ${FOCUS_RING} ${FOCUS_RING_OFFSET}`}
          >
            {activeTab === 'scans' ? <ScansTable /> : <LeadsTable />}
          </div>
        </div>
      </div>
    </div>
  );
}
