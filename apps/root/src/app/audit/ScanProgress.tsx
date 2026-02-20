'use client';

import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { ProgressBar, Spinner, Stack } from '@danieljoffe.com/shared-ui';

const STEPS = [
  { label: 'Launching browser...', completesAt: 2 },
  { label: 'Loading your page...', completesAt: 5 },
  { label: 'Measuring performance...', completesAt: 10 },
  { label: 'Checking accessibility...', completesAt: 15 },
  { label: 'Generating report...', completesAt: 20 },
] as const;

interface ScanProgressProps {
  url: string;
}

export default function ScanProgress({ url }: ScanProgressProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(prev => prev + 0.1);
    }, 100);
    return () => clearInterval(interval);
  }, []);

  const progress = Math.min(90, (elapsed / 25) * 90);

  return (
    <Stack direction='vertical' gap='md' className='w-full max-w-md'>
      <ProgressBar value={progress} size='md' aria-label='Scan progress' />
      <ul className='space-y-3' aria-label='Scan steps'>
        {STEPS.map(step => {
          const isComplete = elapsed >= step.completesAt;
          const isActive =
            !isComplete &&
            (step === STEPS[0] ||
              elapsed >= STEPS[STEPS.indexOf(step) - 1].completesAt);

          return (
            <li key={step.label} className='flex items-center gap-3'>
              {isComplete ? (
                <span className='inline-flex items-center justify-center size-5 rounded-full bg-success text-success-foreground'>
                  <Check className='size-3' aria-hidden='true' />
                </span>
              ) : isActive ? (
                <Spinner size='sm' aria-label={step.label} />
              ) : (
                <span className='inline-block size-5 rounded-full border border-border' />
              )}
              <span
                className={
                  isComplete
                    ? 'text-foreground'
                    : isActive
                      ? 'text-foreground'
                      : 'text-foreground-subtle'
                }
              >
                {step.label}
              </span>
            </li>
          );
        })}
      </ul>
      <p className='text-sm text-foreground-muted text-center truncate'>
        Scanning {url}
      </p>
    </Stack>
  );
}
