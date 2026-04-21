import { CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { Heading } from '@danieljoffe.com/shared-ui/Heading';
import { Section } from '@danieljoffe.com/shared-ui/Section';
import { Text } from '@danieljoffe.com/shared-ui/Text';

interface CoreWebVitalsProps {
  fcpMs: number | null;
  lcpMs: number | null;
  tbtMs: number | null;
  cls: number | null;
  siMs: number | null;
  deviceMode?: 'mobile' | 'desktop';
}

interface Metric {
  label: string;
  value: number | null;
  format: (v: number) => string;
  good: number;
  poor: number;
}

function getStatus(value: number, good: number, poor: number) {
  if (value <= good) return 'good' as const;
  if (value <= poor) return 'needs-improvement' as const;
  return 'poor' as const;
}

const StatusIcon = ({
  status,
}: {
  status: 'good' | 'needs-improvement' | 'poor';
}) => {
  if (status === 'good')
    return <CheckCircle className='size-5 text-success' aria-label='Good' />;
  if (status === 'needs-improvement')
    return (
      <AlertTriangle
        className='size-5 text-warning'
        aria-label='Needs improvement'
      />
    );
  return <XCircle className='size-5 text-error' aria-label='Poor' />;
};

function formatSeconds(ms: number): string {
  return `${(ms / 1000).toFixed(1)} s`;
}

function formatMs(ms: number): string {
  return `${Math.round(ms)} ms`;
}

function formatCls(value: number): string {
  return value.toFixed(3);
}

export default function CoreWebVitals({
  fcpMs,
  lcpMs,
  tbtMs,
  cls,
  siMs,
  deviceMode,
}: CoreWebVitalsProps) {
  const metrics: Metric[] = [
    {
      label: 'First Contentful Paint',
      value: fcpMs,
      format: formatSeconds,
      good: 1800,
      poor: 3000,
    },
    {
      label: 'Largest Contentful Paint',
      value: lcpMs,
      format: formatSeconds,
      good: 2500,
      poor: 4000,
    },
    {
      label: 'Total Blocking Time',
      value: tbtMs,
      format: formatMs,
      good: 200,
      poor: 600,
    },
    {
      label: 'Cumulative Layout Shift',
      value: cls,
      format: formatCls,
      good: 0.1,
      poor: 0.25,
    },
    {
      label: 'Speed Index',
      value: siMs,
      format: formatSeconds,
      good: 3400,
      poor: 5800,
    },
  ];

  return (
    <Section
      aria-labelledby='core-web-vitals-heading'
      background='alt'
      overflow='hidden'
      center
    >
      <Heading variant='section' as='h2' id='core-web-vitals-heading'>
        Core Web Vitals
      </Heading>
      <Text variant='detail' className='mb-4'>
        {deviceMode === 'desktop'
          ? 'Measured under simulated desktop conditions (no CPU throttling, broadband).'
          : 'Measured under simulated mobile conditions (2x CPU slowdown, 4G network).'}
      </Text>
      <div className='rounded-lg border border-border bg-surface-elevated p-6'>
        <div className='flex flex-col'>
          {metrics.map((metric, i) => {
            const status =
              metric.value !== null
                ? getStatus(metric.value, metric.good, metric.poor)
                : null;

            return (
              <div
                key={metric.label}
                className={`flex items-center justify-between py-3 ${
                  i < metrics.length - 1 ? 'border-b border-border' : ''
                }`}
              >
                <span className='text-sm'>{metric.label}</span>
                <div className='flex flex-row gap-2 items-center'>
                  <span className='text-sm font-medium tabular-nums'>
                    {metric.value !== null
                      ? metric.format(metric.value)
                      : 'N/A'}
                  </span>
                  {status && <StatusIcon status={status} />}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Section>
  );
}
