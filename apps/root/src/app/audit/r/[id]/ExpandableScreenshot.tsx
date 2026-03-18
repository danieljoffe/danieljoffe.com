'use client';

import { useState } from 'react';
import { Globe } from 'lucide-react';
import type { DeviceMode } from '@danieljoffe.com/shared-audit';
import { cn } from '@danieljoffe.com/shared-ui';
import Image from 'next/image';

interface ExpandableScreenshotProps {
  screenshotUrl: string | null;
  alt: string;
  deviceMode?: DeviceMode | undefined;
}

const dimensions = {
  mobile: {
    collapsed: 'w-[9rem] h-[16rem]',
    expanded: 'w-[13.5rem] h-[24rem] md:w-[18.75rem] md:h-[33.3rem]',
  },
  desktop: {
    collapsed: 'w-[16rem] h-[11rem]',
    expanded: 'w-[24rem] h-[16.5rem] md:w-[33.75rem] md:h-[23.5rem]',
  },
};

export default function ExpandableScreenshot({
  screenshotUrl,
  alt,
  deviceMode = 'mobile',
}: ExpandableScreenshotProps) {
  const [expanded, setExpanded] = useState(false);
  const size = dimensions[deviceMode];

  if (!screenshotUrl) {
    return (
      <span className='inline-flex items-center justify-center w-16 h-12 rounded border border-border bg-surface-elevated shrink-0'>
        <Globe className='size-6 text-text-tertiary' aria-hidden='true' />
      </span>
    );
  }

  return (
    <button
      type='button'
      onClick={() => setExpanded(prev => !prev)}
      className='cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 rounded shrink-0 transition-all duration-200'
      aria-expanded={expanded}
      aria-label={expanded ? 'Collapse screenshot' : 'Expand screenshot'}
    >
      <div
        className={cn(
          'relative max-w-full rounded border border-border overflow-hidden transition-all duration-300 ease-in-out',
          expanded ? size.expanded : size.collapsed
        )}
      >
        <Image
          src={screenshotUrl}
          alt={alt}
          fill
          className='object-cover object-top'
          sizes='(max-width: 768px) 18.75rem, 33.75rem'
        />
      </div>
    </button>
  );
}
