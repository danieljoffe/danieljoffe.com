'use client';

import { ArrowUpRight } from 'lucide-react';
import { PageContainer, Section, Stack, Badge } from '@danieljoffe.com/ui';
import { ABOUT_LINK, CONTACT_FORM_ID } from '@/utils/base';
import { FULL_NAME } from '@/utils/constants';
import { analytics } from '@/lib/analytics';
import Button from '@/components/Button';

export default function Hero() {
  return (
    <Section
      className='min-h-min max-h-max'
      aria-labelledby='services-hero-heading'
      background='alt'
    >
      <PageContainer className='text-center max-w-[40rem]'>
        <Stack direction='vertical' gap='lg' align='center'>
          <Badge variant='success'>Available for new projects — Q1 2026</Badge>
          <div>
            <h1 id='services-hero-heading'>
              Your frontend is costing you users.
            </h1>
            <p className='text-lg'>
              I help startups and growing teams ship faster, load faster, and
              stop depending on engineering for everything.
            </p>
          </div>
          <Button
            as='link'
            href={`${ABOUT_LINK.href}?scrollTo=${CONTACT_FORM_ID}`}
            aria-label={`Start a conversation with ${FULL_NAME}`}
            onClick={() =>
              analytics.ctaClick(
                'services_hero_cta',
                '/about?scrollTo=contact-form'
              )
            }
          >
            <span>Start a conversation</span>
            <ArrowUpRight absoluteStrokeWidth={true} className='w-4 h-4' />
          </Button>
        </Stack>
      </PageContainer>
    </Section>
  );
}
