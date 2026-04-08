'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Calendar } from 'lucide-react';
import { Spinner } from '@danieljoffe.com/shared-ui/Spinner';
import Button from '@/components/Button';
import { analytics } from '@/lib/analytics';
import { CALENDLY_URL } from '@/utils/constants';

const EMBED_HEIGHT = 700;
const LOAD_TIMEOUT_MS = 8000;

export default function CalendlyEmbed() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [shouldLoad, setShouldLoad] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [timedOut, setTimedOut] = useState(false);

  // Intersection observer — start loading when container is near viewport
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Timeout — show fallback if iframe doesn't load in time
  useEffect(() => {
    if (!shouldLoad || isLoaded) return;

    const timer = setTimeout(() => setTimedOut(true), LOAD_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [shouldLoad, isLoaded]);

  // Listen for Calendly postMessage events
  useEffect(() => {
    function handleMessage(e: MessageEvent) {
      if (e.origin !== 'https://calendly.com') return;

      const { event } = e.data ?? {};
      if (event === 'calendly.event_scheduled') {
        analytics.ctaClick('services_calendly_booked', CALENDLY_URL);
      }
    }

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const onIframeLoad = useCallback(() => {
    setIsLoaded(true);
    setTimedOut(false);
  }, []);

  // Fallback — direct link to Calendly
  if (timedOut && !isLoaded) {
    return (
      <div
        className='flex flex-col items-center justify-center gap-4 rounded-xl border border-border bg-surface p-12 text-center'
        data-testid='calendly-fallback'
      >
        <Calendar className='h-10 w-10 text-text-tertiary' />
        <p className='text-text-secondary text-sm max-w-md'>
          The scheduling widget couldn&apos;t load. Book directly on Calendly
          instead.
        </p>
        <Button
          name='calendly-fallback'
          as='link'
          href={CALENDLY_URL}
          target='_blank'
          rel='noopener noreferrer'
          onClick={() =>
            analytics.ctaClick('services_calendly_fallback', CALENDLY_URL)
          }
        >
          Open Calendly
        </Button>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className='relative w-full overflow-hidden rounded-xl border border-border bg-surface'
      style={{ minHeight: EMBED_HEIGHT }}
    >
      {/* Loading spinner — shown until iframe loads */}
      {(!shouldLoad || !isLoaded) && (
        <div className='absolute inset-0 flex items-center justify-center'>
          <Spinner size='md' />
        </div>
      )}

      {shouldLoad && (
        <iframe
          src={`${CALENDLY_URL}?hide_gdpr_banner=1&background_color=1c1917&text_color=e7e5e4&primary_color=0d9488`}
          title='Schedule a discovery call with Daniel Joffe'
          width='100%'
          height={EMBED_HEIGHT}
          frameBorder='0'
          loading='lazy'
          onLoad={onIframeLoad}
          className={[
            'transition-opacity duration-300',
            isLoaded ? 'opacity-100' : 'opacity-0',
          ].join(' ')}
        />
      )}
    </div>
  );
}
