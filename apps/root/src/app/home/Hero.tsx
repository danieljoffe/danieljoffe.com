'use client';

import dynamic from 'next/dynamic';
import { ArrowUpRight, Download } from 'lucide-react';
import {
  PageContainer,
  Section,
  Stack,
  Badge,
  Spacer,
} from '@danieljoffe.com/shared-ui';
import { FULL_NAME, JOB_TITLE } from '@/utils/constants';
import { HOME_LINK, PROJECTS_LINK } from '@/utils/base';
import { downloadResume } from '@/utils/helpers';
import { analytics } from '@/lib/analytics';
import Button from '@/components/Button';

const Blob = dynamic(() => import('./Blob'), {
  loading: () => <div />,
});

export default function Hero() {
  return (
    <Section
      className={[
        'relative h-[50vh] !min-h-[27.5rem] md:!min-h-[32.5rem] max-h-max',
        'flex-col overflow-hidden items-center md:h-[80vh]',
      ].join(' ')}
      aria-labelledby='hero-heading'
    >
      <div className='absolute w-dvw h-[125dvh] top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 max-h-[40rem] opacity-10 dark:opacity-80'>
        <Blob />
      </div>

      <PageContainer className='relative min-h-full'>
        <div
          className={[
            'flex-1 w-full min-h-full flex flex-col justify-evenly',
            'self-center max-w-[35rem]',
          ].join(' ')}
        >
          <div className='flex flex-col'>
            <Badge variant='success' className='self-center'>
              Available for contract work — Q1 2026
            </Badge>
            <Spacer size='sm' />
            <h1 id='hero-heading'>
              <span>Hello.</span>
              <br className='hidden md:block' />
              <span> I&apos;m Daniel Joffe.</span>
            </h1>
            <p className='uppercase tracking-wide font-medium'>{JOB_TITLE}</p>
          </div>

          <Stack direction='vertical' gap='lg' className='text-left text-sm'>
            <div>
              <p>I optimize applications.</p>
              <p>I build scalable design systems.</p>
              <p>And I love eliminating engineering bottlenecks.</p>
            </div>

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
                <ArrowUpRight absoluteStrokeWidth={true} className='w-4 h-4' />
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
                <Download absoluteStrokeWidth={true} className='w-4 h-4' />
                <span>Download resume</span>
              </Button>
            </Stack>
          </Stack>
        </div>
      </PageContainer>
    </Section>
  );
}
