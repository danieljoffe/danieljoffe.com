'use client';
import { ABOUT_LINK, CONTACT_FORM_ID, PROJECTS_LINK } from '@/utils/base';
import { FULL_NAME } from '@/utils/constants';
import { analytics } from '@/lib/analytics';
import Section from '@/components/Section';
import Container from '@/components/Container';
import Button from '@/components/Button';

export default function CTA() {
  return (
    <Section className='bg-neutral-900 text-white' ariaLabelBy='cta-heading'>
      <Container className='text-center max-w-[31rem]'>
        <h2 id='cta-heading'>Let&apos;s Build Something Great Together</h2>
        <div className='flex flex-col items-center self-center  gap-4'>
          <p>
            Ready to discuss how I can help drive your team&apos;s success?
            I&apos;m always excited to tackle new challenges and create
            meaningful impact.
          </p>
          <div className='flex gap-4'>
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
          </div>
        </div>
      </Container>
    </Section>
  );
}
