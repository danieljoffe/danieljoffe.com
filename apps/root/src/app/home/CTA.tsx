'use client';
import Button from '@/components/Button';
import Container from '@/components/Container';
import { ABOUT_LINK, PROJECTS_LINK } from '@/components/Nav/Links';
import { FULL_NAME } from '@/utils/constants';
import { contactFormId } from '@/app/about/Contact/Form';

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
              href={`${ABOUT_LINK.href}?scrollTo=${contactFormId}`}
              aria-label={`Get in touch with ${FULL_NAME}`}
            >
              Get in touch
            </Button>
            <Button
              as='link'
              href={PROJECTS_LINK.href}
              aria-label={`View ${FULL_NAME}'s work portfolio`}
            >
              View my work
            </Button>
          </div>
        </div>
      </Container>
    </section>
  );
}
