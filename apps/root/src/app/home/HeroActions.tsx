'use client';

import { ArrowUpRight, Download } from 'lucide-react';
import { Stack } from '@danieljoffe.com/shared-ui';
import { FULL_NAME, HOME_LINK, PROJECTS_LINK } from '@/utils/constants';
import { downloadResume } from '@/utils/helpers';
import { analytics } from '@/lib/analytics';
import Button from '@/components/Button';

export default function HeroActions() {
  return (
    <Stack direction='vertical' className='items-start'>
      <Button
        as='link'
        className='max-w-max'
        href={PROJECTS_LINK.href}
        aria-label={`View ${FULL_NAME}'s case studies`}
        onClick={() =>
          analytics.ctaClick('view_case_studies', PROJECTS_LINK.href)
        }
      >
        <span>View case studies</span>
        <ArrowUpRight absoluteStrokeWidth={true} className='size-4' />
      </Button>
      <Button
        as='button'
        className='max-w-max'
        aria-label={`Download ${FULL_NAME}'s resume`}
        onClick={() => {
          analytics.ctaClick('download_resume', HOME_LINK.href);
          downloadResume();
        }}
      >
        <Download absoluteStrokeWidth={true} className='size-4' />
        <span>Download resume</span>
      </Button>
    </Stack>
  );
}
