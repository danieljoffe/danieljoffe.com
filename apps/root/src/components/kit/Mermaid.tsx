'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Skeleton } from '@danieljoffe/shared-ui/Skeleton';
import { cn } from '@/lib/cn';

interface MermaidProps {
  /** Mermaid diagram source (flowchart, sequence, etc.) */
  chart: string;
  /**
   * Plain-language description of the diagram for assistive tech and as the
   * visible caption. The surrounding prose should already explain the system;
   * this is the text alternative for the rendered SVG.
   */
  alt: string;
  className?: string;
}

type RenderState =
  | { status: 'loading' }
  | { status: 'rendered'; svg: string }
  | { status: 'error' };

/**
 * Renders a Mermaid diagram on the client. Mermaid is a browser-only library
 * (it touches the DOM), so it is dynamically imported inside an effect to keep
 * it out of the server bundle and avoid breaking SSR/RSC. The diagram is
 * presented as a <figure> with a <figcaption> text alternative, and the raw
 * `chart` source stays in a visually-hidden block so the description survives
 * even if rendering fails.
 */
export function Mermaid({ chart, alt, className }: MermaidProps) {
  const reactId = useId();
  // Mermaid requires a DOM-id-safe string; strip the colons React injects.
  const renderId = `mermaid-${reactId.replace(/[^a-zA-Z0-9]/g, '')}`;
  const [state, setState] = useState<RenderState>({ status: 'loading' });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    async function render() {
      try {
        const mermaid = (await import('mermaid')).default;
        const prefersDark =
          typeof window !== 'undefined' &&
          window.matchMedia('(prefers-color-scheme: dark)').matches;

        mermaid.initialize({
          startOnLoad: false,
          securityLevel: 'strict',
          theme: prefersDark ? 'dark' : 'neutral',
          fontFamily: 'inherit',
        });

        const { svg } = await mermaid.render(renderId, chart);
        if (!cancelled) setState({ status: 'rendered', svg });
      } catch {
        if (!cancelled) setState({ status: 'error' });
      }
    }

    void render();
    return () => {
      cancelled = true;
    };
  }, [chart, renderId]);

  return (
    <figure
      className={cn(
        'my-6 overflow-hidden rounded-lg border border-border bg-surface-secondary',
        className
      )}
    >
      <div className='overflow-x-auto p-4'>
        {state.status === 'loading' && (
          <Skeleton variant='rectangular' className='h-48 w-full' />
        )}
        {state.status === 'rendered' && (
          <div
            ref={containerRef}
            role='img'
            aria-label={alt}
            className='flex justify-center [&_svg]:h-auto [&_svg]:max-w-full'
            // Mermaid produces trusted, self-generated SVG markup.
            dangerouslySetInnerHTML={{ __html: state.svg }}
          />
        )}
        {state.status === 'error' && (
          <pre className='overflow-x-auto whitespace-pre-wrap text-xs leading-relaxed text-text-secondary'>
            {chart}
          </pre>
        )}
      </div>
      <figcaption className='border-t border-border px-4 py-2 text-xs text-text-tertiary'>
        {alt}
      </figcaption>
    </figure>
  );
}
