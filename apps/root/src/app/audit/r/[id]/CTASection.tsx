import { PageContainer, Section, Stack } from '@danieljoffe.com/shared-ui';
import CalendlyButton from './CalendlyButton';

export default function CTASection() {
  return (
    <Section
      aria-labelledby='cta-heading'
      className='min-h-min max-h-max'
      background='alt'
    >
      <PageContainer className='text-center py-16'>
        <Stack direction='vertical' gap='md' align='center'>
          <h2 id='cta-heading' className='font-sans text-3xl font-semibold'>
            Want these fixed?
          </h2>
          <p className='text-text-secondary max-w-md'>
            I help teams ship faster, more accessible websites. Let&apos;s talk
            about what&apos;s slowing yours down.
          </p>
          <CalendlyButton />
        </Stack>
      </PageContainer>
    </Section>
  );
}
