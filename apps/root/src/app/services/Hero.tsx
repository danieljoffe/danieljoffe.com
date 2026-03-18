import { ChevronDown } from 'lucide-react';
import { PageContainer, Section, Stack } from '@danieljoffe.com/shared-ui';
import HeroCTA from './HeroCTA';

export default function Hero() {
  return (
    <Section
      className='min-h-min max-h-max'
      aria-labelledby='services-hero-heading'
      background='alt'
    >
      <PageContainer className='text-center max-w-[40rem]'>
        <Stack direction='vertical' gap='lg' align='center'>
          <span className='inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-brand-500 text-text-inverse'>
            Currently available for new projects
          </span>
          <div>
            <h1 id='services-hero-heading'>
              Your frontend is costing you users.
            </h1>
            <p className='text-lg'>
              I help startups and growing teams ship faster, load faster, and
              stop depending on engineering for everything.
            </p>
          </div>
          <HeroCTA />
          <a
            href='#services-grid-heading'
            className='text-sm text-text-secondary hover:text-brand-500 transition-colors flex items-center gap-1'
          >
            See what I offer
            <ChevronDown className='size-4' />
          </a>
        </Stack>
      </PageContainer>
    </Section>
  );
}
