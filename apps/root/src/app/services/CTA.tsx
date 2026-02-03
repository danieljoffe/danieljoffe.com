'use client';

import { Stack, PageContainer, Section } from '@danieljoffe.com/ui';
import { ABOUT_LINK, CONTACT_FORM_ID } from '@/utils/base';
import { FULL_NAME } from '@/utils/constants';
import { analytics } from '@/lib/analytics';
import Button from '@/components/Button';

export default function CTA() {
  return (
    <Section
      className='min-h-min max-h-max'
      aria-labelledby='services-cta-heading'
    >
      <PageContainer className='text-center max-w-[31rem]'>
        <h2 id='services-cta-heading'>Let&apos;s figure out how I can help.</h2>
        <Stack
          direction='vertical'
          gap='md'
          align='center'
          className='self-center'
        >
          <p>
            Book a free 30-minute call. No contracts, no commitments—just a
            conversation about your frontend challenges.
          </p>
          <Button
            as='link'
            href={`${ABOUT_LINK.href}?scrollTo=${CONTACT_FORM_ID}`}
            aria-label={`Book a discovery call with ${FULL_NAME}`}
            onClick={() =>
              analytics.ctaClick(
                'services_cta_discovery_call',
                '/about?scrollTo=contact-form'
              )
            }
          >
            Book a Discovery Call
          </Button>
        </Stack>
      </PageContainer>
    </Section>
  );
}
