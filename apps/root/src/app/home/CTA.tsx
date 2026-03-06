import {
  ABOUT_LINK,
  CONTACT_FORM_ID,
  PROJECTS_LINK,
  FULL_NAME,
} from '@/utils/constants';
import { Stack } from '@danieljoffe.com/shared-ui';
import CTASection from '@/components/CTASection';
import CTAButton from '@/components/CTAButton';

export default function CTA() {
  return (
    <CTASection
      headingId='cta-heading'
      heading="Let's Build Something Great Together"
      description="Available for contract projects and fractional engineering engagements. Let's talk about your project."
    >
      <Stack direction='horizontal' gap='md'>
        <CTAButton
          href={`${ABOUT_LINK.href}?scrollTo=${CONTACT_FORM_ID}`}
          ariaLabel={`Start a conversation with ${FULL_NAME}`}
          analyticsId='start_conversation'
        >
          <span>Start a conversation</span>
        </CTAButton>
        <CTAButton
          href={PROJECTS_LINK.href}
          ariaLabel='View my work'
          analyticsId='view_my_work'
        >
          <span>View my work</span>
        </CTAButton>
      </Stack>
    </CTASection>
  );
}
