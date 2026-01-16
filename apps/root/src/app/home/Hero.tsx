'use client';

import Button from '@/components/Button';
import Container from '@/components/Container';
import { FULL_NAME, JOB_TITLE } from '@/utils/constants';
import { analytics } from '@/lib/analytics';
import { HOME_LINK, PROJECTS_LINK } from '@/utils/base';
import dynamic from 'next/dynamic';
import { downloadResume } from '@/utils/helpers';
import Section from '@/components/Section';

const Blob = dynamic(() => import('./Blob'), {
  loading: () => <div />,
});

export default function Hero() {
  return (
    <Section
      className='min-h-[50vh] flex-col overflow-hidden items-center md:min-h-[80vh]'
      aria-labelledby='hero-heading'
    >
      <div className='flex relative w-full h-0 top-[50%]'>
        <div className='absolute -z-1 flex w-dvw h-dvh top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 justify-center items-center'>
          <Blob />
        </div>
      </div>

      <div className='min-h-full min-w-full bg-[#00000099] text-white'>
        <Container className='min-h-full'>
          <div
            className={[
              'flex-1 w-full min-h-full flex flex-col justify-evenly',
              'self-center max-w-[35rem]',
            ].join(' ')}
          >
            <div>
              <h1 id='hero-heading'>
                <span>Hello.</span>
                <br className='hidden md:block' />
                <span> I&apos;m Daniel Joffe.</span>
              </h1>
              <p className='uppercase tracking-wide'>{JOB_TITLE}</p>
            </div>

            <div className='flex flex-col text-right text-sm gap-2'>
              <div>
                <p>I optimize applications.</p>
                <p>I build scalable design systems.</p>
                <p>And I love eliminating engineering bottlenecks.</p>
              </div>

              <div className='flex justify-evenly md:justify-end'>
                <Button
                  as='link'
                  variant='link'
                  href={PROJECTS_LINK.href}
                  aria-label={`View ${FULL_NAME}'s case studies`}
                  onClick={() =>
                    analytics.ctaClick('view_case_studies', PROJECTS_LINK.href)
                  }
                >
                  View case studies
                </Button>
                <Button
                  as='button'
                  variant='link'
                  aria-label={`Download ${FULL_NAME}'s resume`}
                  onClick={() => {
                    analytics.ctaClick('download_resume', HOME_LINK.href);
                    downloadResume();
                  }}
                >
                  Download resume
                </Button>
              </div>
            </div>
          </div>
        </Container>
      </div>
    </Section>
  );
}
