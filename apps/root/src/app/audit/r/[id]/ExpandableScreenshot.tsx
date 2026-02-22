'use client';

import { useState } from 'react';
import { Globe } from 'lucide-react';

interface ExpandableScreenshotProps {
  screenshotUrl: string | null;
  alt: string;
}

export default function ExpandableScreenshot({
  screenshotUrl,
  alt,
}: ExpandableScreenshotProps) {
  const [expanded, setExpanded] = useState(false);

  if (!screenshotUrl) {
    return (
      <span className='inline-flex items-center justify-center w-16 h-12 rounded border border-border bg-background-elevated shrink-0'>
        <Globe className='size-6 text-foreground-subtle' aria-hidden='true' />
      </span>
    );
  }

  return (
    <button
      type='button'
      onClick={() => setExpanded(prev => !prev)}
      className='cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent rounded shrink-0 transition-all duration-200'
      aria-expanded={expanded}
      aria-label={expanded ? 'Collapse screenshot' : 'Expand screenshot'}
    >
      <picture>
        <img
          src={screenshotUrl}
          alt={alt}
          className={`rounded border border-border object-cover object-top transition-all duration-300 ease-in-out ${
            expanded
              ? 'w-[13.5rem] h-[24rem] md:w-[18.75rem] md:h-[36rem]'
              : 'w-[9rem] h-[16rem]'
          }`}
        />
      </picture>
    </button>
  );
}
