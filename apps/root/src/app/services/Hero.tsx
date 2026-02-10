'use client';

import { ArrowUpRight } from 'lucide-react';
import {
  PageContainer,
  Section,
  Stack,
  Badge,
} from '@danieljoffe.com/shared-ui';
import { CALENDLY_URL, FULL_NAME } from '@/utils/constants';
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
          <Badge variant='success'>Currently available for new projects</Badge>
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
            href={CALENDLY_URL}
            target='_blank'
            aria-label={`Book a discovery call with ${FULL_NAME}`}
            onClick={() =>
              analytics.ctaClick('services_hero_cta', CALENDLY_URL)
            }
          >
            <span>Book a Discovery Call</span>
            <ArrowUpRight absoluteStrokeWidth={true} className='w-4 h-4' />
          </Button>
        </Stack>
      </PageContainer>
    </Section>
  );
}
