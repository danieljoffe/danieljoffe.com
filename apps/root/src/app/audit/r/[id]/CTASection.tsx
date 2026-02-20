import { PageContainer, Section, Stack } from '@danieljoffe.com/shared-ui';
import Button from '@/components/Button';
import { CALENDLY_URL } from '@/utils/constants';

export default function CTASection() {
  return (
    <Section
      aria-labelledby='cta-heading'
      className='min-h-min max-h-max'
      background='alt'
    >
      <PageContainer className='text-center py-16'>
        <Stack direction='vertical' gap='md' align='center'>
          <h2 id='cta-heading' className='font-heading text-3xl font-semibold'>
            Want these fixed?
          </h2>
          <p className='text-foreground-muted max-w-md'>
            I help teams ship faster, more accessible websites. Let&apos;s talk
            about what&apos;s slowing yours down.
          </p>
          <Button as='link' href={CALENDLY_URL} variant='primary' size='lg'>
            Book a free discovery call
          </Button>
        </Stack>
      </PageContainer>
    </Section>
  );
}
