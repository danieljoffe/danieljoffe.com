'use client';

import { ArrowUpRight, Download, Mail } from 'lucide-react';
import { PROJECTS_LINK, HOME_LINK, EMAIL_ADDRESS } from '@/utils/constants';
import { downloadResume } from '@/utils/helpers';
import { analytics } from '@/lib/analytics';
import Button from '@/components/Button';

export default function HeroActions() {
  return (
    <div className='flex flex-wrap items-center gap-3 pt-2'>
      <Button
        as='link'
        href={PROJECTS_LINK.href}
        aria-label='View case studies'
        size='sm'
        onClick={() =>
          analytics.ctaClick('view_case_studies', PROJECTS_LINK.href)
        }
      >
        View case studies
        <ArrowUpRight className='h-4 w-4' />
      </Button>
      <Button
        variant='secondary'
        size='sm'
        aria-label='Download resume'
        name='download-resume'
        onClick={() => {
          analytics.ctaClick('download_resume', HOME_LINK.href);
          downloadResume();
        }}
      >
        <Download className='h-4 w-4' />
        Download resume
      </Button>
      <a
        href={`mailto:${EMAIL_ADDRESS}`}
        aria-label={`Email ${EMAIL_ADDRESS}`}
        className='inline-flex items-center gap-1.5 text-sm text-text-tertiary hover:text-text-primary transition-colors'
        onClick={() =>
          analytics.ctaClick('email_hero', `mailto:${EMAIL_ADDRESS}`)
        }
      >
        <Mail className='h-4 w-4' />
        {EMAIL_ADDRESS}
      </a>
    </div>
  );
}
