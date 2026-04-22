'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { Skeleton } from '@danieljoffe.com/shared-ui/Skeleton';
import { cn } from '@/lib/cn';
import { STORYBOOK_URL } from '@/utils/constants';

interface DemoControl {
  label: string;
  args: Record<string, string>;
}

interface InteractiveDemoProps {
  /** Storybook story ID (e.g. "button--primary") */
  story: string;
  /** Storybook args to pass via URL params (e.g. { variant: "secondary", size: "lg" }) */
  args?: Record<string, string>;
  /** Variant controls rendered as buttons above the iframe */
  controls?: DemoControl[];
  /** Iframe height in pixels */
  height?: number;
  /** Accessible title for the iframe */
  title: string;
}

function buildArgsParam(args: Record<string, string>): string {
  const entries = Object.entries(args);
  if (entries.length === 0) return '';
  return `&args=${entries.map(([k, v]) => `${k}:${v}`).join(';')}`;
}

const LOAD_TIMEOUT_MS = 10_000;

export function InteractiveDemo({
  story,
  args,
  controls,
  height = 300,
  title,
}: InteractiveDemoProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [activeControl, setActiveControl] = useState(0);

  const activeArgs = controls ? controls[activeControl]?.args : args;
  const argsParam = activeArgs ? buildArgsParam(activeArgs) : '';
  const storyUrl = `${STORYBOOK_URL}/iframe.html?id=${story}&viewMode=story${argsParam}`;
  const fullUrl = `${STORYBOOK_URL}/?path=/story/${story}`;

  // Lazy-load via IntersectionObserver
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Timeout fallback
  useEffect(() => {
    if (!isVisible || isLoaded || hasError) return;

    const timeout = setTimeout(() => {
      setHasError(true);
    }, LOAD_TIMEOUT_MS);

    return () => clearTimeout(timeout);
  }, [isVisible, isLoaded, hasError]);

  const handleLoad = useCallback(() => {
    setIsLoaded(true);
  }, []);

  const handleError = useCallback(() => {
    setHasError(true);
  }, []);

  const handleControlClick = useCallback((index: number) => {
    setActiveControl(index);
    setIsLoaded(false);
    setHasError(false);
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn(
        'my-6 overflow-hidden rounded-lg border border-border',
        'bg-surface-secondary'
      )}
    >
      <div className='flex items-center justify-between border-b border-border px-4 py-2'>
        <span className='text-xs font-medium text-text-secondary'>{title}</span>
        <a
          href={fullUrl}
          target='_blank'
          rel='noopener noreferrer'
          className='flex items-center gap-1 text-xs text-brand-500 hover:text-brand-600 transition-colors'
        >
          Open in Storybook
          <ExternalLink className='h-3 w-3' />
        </a>
      </div>

      {controls && controls.length > 0 && (
        <div
          className='flex flex-wrap gap-1.5 border-b border-border px-4 py-2'
          role='group'
          aria-label='Demo variant controls'
        >
          {controls.map((control, i) => (
            <button
              key={control.label}
              type='button'
              onClick={() => handleControlClick(i)}
              className={cn(
                'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                i === activeControl
                  ? 'bg-brand-500 text-text-inverse'
                  : 'bg-surface-elevated text-text-secondary hover:text-text-primary hover:bg-surface-tertiary'
              )}
            >
              {control.label}
            </button>
          ))}
        </div>
      )}

      <div className='relative' style={{ height }}>
        {hasError ? (
          <div className='flex h-full flex-col items-center justify-center gap-3 p-4'>
            <p className='text-sm text-text-tertiary'>
              Demo unavailable — open it directly in Storybook.
            </p>
            <a
              href={fullUrl}
              target='_blank'
              rel='noopener noreferrer'
              className='inline-flex items-center gap-1.5 rounded-md bg-brand-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-600 transition-colors'
            >
              Open in Storybook
              <ExternalLink className='h-3 w-3' />
            </a>
          </div>
        ) : (
          <>
            {(!isVisible || !isLoaded) && (
              <div className='absolute inset-0 p-4'>
                <Skeleton variant='rectangular' className='h-full w-full' />
              </div>
            )}
            {isVisible && (
              <iframe
                src={storyUrl}
                title={title}
                className={cn(
                  'h-full w-full border-0',
                  !isLoaded && 'invisible'
                )}
                onLoad={handleLoad}
                onError={handleError}
                sandbox='allow-scripts allow-same-origin'
                loading='lazy'
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
