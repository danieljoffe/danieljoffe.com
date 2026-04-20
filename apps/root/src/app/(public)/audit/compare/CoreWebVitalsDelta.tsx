import { Heading } from '@danieljoffe.com/shared-ui/Heading';
import { Text } from '@danieljoffe.com/shared-ui/Text';
import { sectionContainer } from '@/lib/layoutStyles';
import { cwvDelta } from './calcDelta';
import DeltaIndicator from './DeltaIndicator';

interface CoreWebVitalsDeltaProps {
  scanA: {
    fcp_ms: number | null;
    lcp_ms: number | null;
    tbt_ms: number | null;
    cls: number | null;
    si_ms: number | null;
  };
  scanB: {
    fcp_ms: number | null;
    lcp_ms: number | null;
    tbt_ms: number | null;
    cls: number | null;
    si_ms: number | null;
  };
}

interface Metric {
  label: string;
  a: number | null;
  b: number | null;
  format: (v: number) => string;
  formatDelta: (v: number) => string;
}

function formatSeconds(ms: number): string {
  return `${(ms / 1000).toFixed(1)} s`;
}

function formatMs(ms: number): string {
  return `${Math.round(ms)} ms`;
}

function formatCls(value: number): string {
  return value.toFixed(3);
}

function formatSecondsDelta(ms: number): string {
  return `${(Math.abs(ms) / 1000).toFixed(2)} s`;
}

function formatMsDelta(ms: number): string {
  return `${Math.round(Math.abs(ms))} ms`;
}

function formatClsDelta(value: number): string {
  return Math.abs(value).toFixed(3);
}

export default function CoreWebVitalsDelta({
  scanA,
  scanB,
}: CoreWebVitalsDeltaProps) {
  const metrics: Metric[] = [
    {
      label: 'First Contentful Paint',
      a: scanA.fcp_ms,
      b: scanB.fcp_ms,
      format: formatSeconds,
      formatDelta: formatSecondsDelta,
    },
    {
      label: 'Largest Contentful Paint',
      a: scanA.lcp_ms,
      b: scanB.lcp_ms,
      format: formatSeconds,
      formatDelta: formatSecondsDelta,
    },
    {
      label: 'Total Blocking Time',
      a: scanA.tbt_ms,
      b: scanB.tbt_ms,
      format: formatMs,
      formatDelta: formatMsDelta,
    },
    {
      label: 'Cumulative Layout Shift',
      a: scanA.cls,
      b: scanB.cls,
      format: formatCls,
      formatDelta: formatClsDelta,
    },
    {
      label: 'Speed Index',
      a: scanA.si_ms,
      b: scanB.si_ms,
      format: formatSeconds,
      formatDelta: formatSecondsDelta,
    },
  ];

  return (
    <section aria-labelledby='cwv-delta-heading' className={sectionContainer}>
      <div className='max-w-3xl mx-auto w-full px-4 sm:px-6 py-8 md:py-14'>
        <Heading variant='section' as='h2' id='cwv-delta-heading'>
          Core Web Vitals
        </Heading>
        <Text variant='detail' className='mb-4'>
          Lower values are better for every metric below.
        </Text>
        <div className='rounded-lg border border-border bg-surface-elevated p-6'>
          <div className='flex flex-col'>
            {metrics.map((metric, i) => {
              const delta = cwvDelta(metric.a, metric.b);
              return (
                <div
                  key={metric.label}
                  className={`flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between py-3 ${
                    i < metrics.length - 1 ? 'border-b border-border' : ''
                  }`}
                >
                  <span className='text-sm'>{metric.label}</span>
                  <div className='flex flex-row gap-3 items-center justify-between sm:justify-end'>
                    <span className='text-sm tabular-nums text-text-secondary'>
                      {metric.a !== null ? metric.format(metric.a) : 'N/A'}
                    </span>
                    <span className='text-text-secondary' aria-hidden='true'>
                      →
                    </span>
                    <span className='text-sm font-medium tabular-nums'>
                      {metric.b !== null ? metric.format(metric.b) : 'N/A'}
                    </span>
                    <DeltaIndicator
                      delta={delta}
                      formatValue={metric.formatDelta}
                      className='min-w-20 justify-end'
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
