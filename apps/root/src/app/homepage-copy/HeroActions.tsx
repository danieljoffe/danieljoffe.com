'use client';

import { ArrowUpRight, Download } from 'lucide-react';
import { PROJECTS_LINK, HOME_LINK } from '@/utils/constants';
import { downloadResume } from '@/utils/helpers';
import { analytics } from '@/lib/analytics';

export default function HeroActions() {
  return (
    <div className='flex flex-wrap items-center gap-3 pt-2'>
      <a
        href={PROJECTS_LINK.href}
        aria-label='View case studies'
        onClick={() =>
          analytics.ctaClick('view_case_studies', PROJECTS_LINK.href)
        }
        className='inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition-colors'
      >
        View case studies
        <ArrowUpRight className='h-4 w-4' />
      </a>
      <button
        aria-label='Download resume'
        onClick={() => {
          analytics.ctaClick('download_resume', HOME_LINK.href);
          downloadResume();
        }}
        className='inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm font-medium text-text-primary hover:bg-surface-tertiary transition-colors cursor-pointer'
      >
        <Download className='h-4 w-4' />
        Download resume
      </button>
    </div>
  );
}
