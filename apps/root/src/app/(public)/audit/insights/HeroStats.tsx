import { Heading } from '@danieljoffe/shared-ui/Heading';
import { Section } from '@danieljoffe/shared-ui/Section';
import { Text } from '@danieljoffe/shared-ui/Text';
import type { SummaryData } from './types';

interface HeroStatsProps {
  data: SummaryData;
}

function getScoreColor(score: number | null): string {
  if (score === null) return '#888';
  if (score >= 90) return '#63CAA5';
  if (score >= 75) return '#8C8FFF';
  if (score >= 60) return '#FFB46B';
  if (score >= 40) return '#FF8CA0';
  return '#FF6B6B';
}

export default function HeroStats({ data }: HeroStatsProps) {
  const scoreColor = getScoreColor(data.avgOverallScore);

  return (
    <Section aria-labelledby='insights-hero-heading' padding='lg'>
      <div className='text-center mb-12'>
        <Heading variant='hero' as='h1' id='insights-hero-heading'>
          Audit Insights
        </Heading>
        <Text variant='bodyLg' className='mt-3 max-w-2xl mx-auto'>
          Aggregated data from every scan run through the free audit tool. See
          what issues affect real websites the most.
        </Text>
      </div>

      {/* Focal stat: average score */}
      <div className='flex flex-col items-center mb-10 animate-fade-in'>
        <p
          className='text-7xl md:text-8xl font-bold tracking-tight'
          style={{ color: scoreColor }}
          aria-label={
            data.avgOverallScore !== null
              ? `Average score: ${Math.round(data.avgOverallScore)} out of 100`
              : 'No score data available'
          }
        >
          {data.avgOverallScore !== null
            ? Math.round(data.avgOverallScore)
            : '—'}
        </p>
        <Text variant='detail' className='mt-2' aria-hidden='true'>
          Average score across all audits
        </Text>
      </div>

      {/* Supporting stats */}
      <div className='grid grid-cols-2 gap-4 max-w-md mx-auto animate-slide-up'>
        <div className='rounded-lg border border-border bg-surface-elevated p-5 text-center'>
          <p className='text-2xl font-bold text-foreground'>
            {data.totalScans.toLocaleString()}
          </p>
          <Text variant='detail' className='mt-1'>
            Sites Audited
          </Text>
        </div>
        <div className='rounded-lg border border-border bg-surface-elevated p-5 text-center'>
          <p className='text-2xl font-bold text-foreground'>
            {data.uniqueDomains.toLocaleString()}
          </p>
          <Text variant='detail' className='mt-1'>
            Unique Domains
          </Text>
        </div>
      </div>

      {/* Top violation callout */}
      {data.topViolation && (
        <div className='mt-8 rounded-lg border border-border bg-surface-elevated px-6 py-4 max-w-lg mx-auto text-center animate-slide-up'>
          <Text variant='detail' className='mb-1'>
            #1 issue found across all scans
          </Text>
          <p className='text-lg font-semibold text-foreground'>
            {data.topViolation}
          </p>
        </div>
      )}
    </Section>
  );
}
