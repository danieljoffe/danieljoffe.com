'use client';
import Button from '@/components/Button';
import Container from '@/components/Container';
import { FULL_NAME } from '@/utils/constants';
import { analytics } from '@/lib/analytics';
import { ABOUT_LINK, CONTACT_FORM_ID, PROJECTS_LINK } from '@/utils/base';

export default function CTA() {
  return (
    <section
      className='bg-neutral-900 text-white'
      aria-labelledby='cta-heading'
    >
      <Container>
        <div className='flex flex-col max-w-[32rem] items-center self-center text-center gap-4'>
          <h2 id='cta-heading'>Let&apos;s Build Something Great Together</h2>
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
    </section>
  );
}
