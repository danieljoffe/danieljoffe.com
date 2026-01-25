'use client';
import { ABOUT_LINK, CONTACT_FORM_ID, PROJECTS_LINK } from '@/utils/base';
import { FULL_NAME } from '@/utils/constants';
import { analytics } from '@/lib/analytics';
import { Stack, PageContainer, Section } from '@danieljoffe.com/ui';
import Button from '@/components/Button';

export default function CTA() {
  return (
    <Section
      className='min-h-min max-h-max bg-neutral-900 text-white'
      aria-labelledby='cta-heading'
    >
      <PageContainer className='text-center max-w-[31rem]'>
        <h2 id='cta-heading'>Let&apos;s Build Something Great Together</h2>
        <Stack
          direction='vertical'
          gap='md'
          align='center'
          className='self-center'
        >
          <p>
            Ready to discuss how I can help drive your team&apos;s success?
            I&apos;m always excited to tackle new challenges and create
            meaningful impact.
          </p>
          <Stack direction='horizontal' gap='md'>
            <Button
              as='link'
              href={`${ABOUT_LINK.href}?scrollTo=${CONTACT_FORM_ID}`}
              aria-label={`Get in touch with ${FULL_NAME}`}
              onClick={() =>
                analytics.ctaClick(
                  'get_in_touch',
                  '/about?scrollTo=contact-form'
                )
              }
            >
              Get in touch
            </Button>
            <Button
              as='link'
              href={PROJECTS_LINK.href}
              aria-label={`View ${FULL_NAME}'s work portfolio`}
              onClick={() => analytics.ctaClick('view_my_work', '/projects')}
            >
              View my work
            </Button>
          </Stack>
        </Stack>
      </PageContainer>
    </Section>
  );
}
