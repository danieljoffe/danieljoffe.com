import { Heading } from '@danieljoffe.com/shared-ui/Heading';
import { Text } from '@danieljoffe.com/shared-ui/Text';
import type { SummaryData } from './types';

interface HeroStatsProps {
  data: SummaryData;
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className='rounded-lg border border-border bg-surface-elevated p-6 text-center'>
      <Text variant='detail' className='mb-1'>
        {label}
      </Text>
      <p className='text-3xl font-bold text-foreground'>{value}</p>
    </div>
  );
}

export default function HeroStats({ data }: HeroStatsProps) {
  return (
    <section aria-labelledby='insights-hero-heading' className='w-full py-16'>
      <div className='max-w-4xl mx-auto w-full px-4 sm:px-6'>
        <div className='text-center mb-10'>
          <Heading variant='page' as='h1' id='insights-hero-heading'>
            Audit Insights
          </Heading>
          <Text variant='bodyLg' className='mt-3 max-w-2xl mx-auto'>
            Aggregated data from every scan run through the free audit tool. See
            what issues affect real websites the most.
          </Text>
        </div>
        <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
          <StatCard
            label='Sites Audited'
            value={data.totalScans.toLocaleString()}
          />
          <StatCard
            label='Unique Domains'
            value={data.uniqueDomains.toLocaleString()}
          />
          <StatCard
            label='Avg Score'
            value={
              data.avgOverallScore !== null
                ? `${Math.round(data.avgOverallScore)}`
                : 'N/A'
            }
          />
          <StatCard label='Top Issue' value={data.topViolation ?? 'N/A'} />
        </div>
      </div>
    </section>
  );
}
