'use client';

import {
  ABOUT_LINK,
  CONTACT_FORM_ID,
  PROJECTS_LINK,
  FULL_NAME,
} from '@/utils/constants';
import { analytics } from '@/lib/analytics';
import CTASection from '@/components/CTASection';

export default function CTA() {
  return (
    <CTASection
      headingId='cta-heading'
      heading="Let's Build Something Great Together"
      description="Available for contract projects and fractional engineering engagements. Let's talk about your project."
      buttons={[
        {
          label: 'Start a conversation',
          href: `${ABOUT_LINK.href}?scrollTo=${CONTACT_FORM_ID}`,
          ariaLabel: `Start a conversation with ${FULL_NAME}`,
          onClick: () =>
            analytics.ctaClick(
              'start_conversation',
              '/about?scrollTo=contact-form'
            ),
        },
        {
          label: 'View my work',
          href: PROJECTS_LINK.href,
          ariaLabel: 'View my work',
          onClick: () => analytics.ctaClick('view_my_work', '/projects'),
        },
      ]}
    />
  );
}
