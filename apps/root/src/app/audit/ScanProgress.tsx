'use client';

import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { Spinner } from '@danieljoffe.com/shared-ui/Spinner';
import { Text } from '@danieljoffe.com/shared-ui/Text';

type DeviceSelection = 'mobile' | 'desktop' | 'both';

const SINGLE_STEPS = [
  { label: 'Launching browser...', completesAt: 2 },
  { label: 'Loading your page...', completesAt: 5 },
  { label: 'Measuring performance...', completesAt: 10 },
  { label: 'Checking accessibility...', completesAt: 15 },
  { label: 'Generating report...', completesAt: 20 },
] as const;

const BOTH_STEPS = [
  { label: 'Launching browser...', completesAt: 2 },
  { label: 'Loading your page...', completesAt: 5 },
  { label: 'Running mobile scan...', completesAt: 12 },
  { label: 'Running desktop scan...', completesAt: 20 },
  { label: 'Generating report...', completesAt: 25 },
] as const;

interface ScanProgressProps {
  url: string;
  device?: DeviceSelection;
}

export default function ScanProgress({
  url,
  device = 'mobile',
}: ScanProgressProps) {
  const [elapsed, setElapsed] = useState(0);
  const steps = device === 'both' ? BOTH_STEPS : SINGLE_STEPS;
  const maxTime = device === 'both' ? 30 : 25;

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(prev => prev + 0.1);
    }, 100);
    return () => clearInterval(interval);
  }, []);

  const progress = Math.min(90, (elapsed / maxTime) * 90);

  const deviceLabel =
    device === 'both'
      ? 'mobile + desktop'
      : device === 'desktop'
        ? 'desktop'
        : 'mobile';

  return (
    <div className='flex flex-col gap-4 w-full max-w-md'>
      <div className='w-full'>
        <div
          role='progressbar'
          aria-valuenow={Math.round(progress)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label='Scan progress'
          className='w-full bg-surface-elevated rounded-full overflow-hidden h-2'
        >
          <div
            className='h-full bg-brand-500 transition-all duration-300 ease-out'
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
      <ul className='space-y-3' aria-label='Scan steps'>
        {steps.map((step, i) => {
          const isComplete = elapsed >= step.completesAt;
          const isActive =
            !isComplete && (i === 0 || elapsed >= steps[i - 1].completesAt);

          return (
            <li key={step.label} className='flex items-center gap-3'>
              {isComplete ? (
                <span className='inline-flex items-center justify-center size-5 rounded-full bg-success text-text-inverse'>
                  <Check className='size-3' aria-hidden='true' />
                </span>
              ) : isActive ? (
                <Spinner size='sm' aria-label='In progress' />
              ) : (
                <span className='inline-block size-5 rounded-full border border-border' />
              )}
              <span
                className={
                  isComplete
                    ? 'text-text-primary'
                    : isActive
                      ? 'text-text-primary'
                      : 'text-text-tertiary'
                }
              >
                {step.label}
              </span>
            </li>
          );
        })}
      </ul>
      <Text variant='body' className='text-center truncate'>
        Scanning {url} ({deviceLabel})
      </Text>
    </div>
  );
}
