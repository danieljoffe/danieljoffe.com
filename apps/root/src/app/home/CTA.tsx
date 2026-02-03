'use client';

import { ABOUT_LINK, CONTACT_FORM_ID, PROJECTS_LINK } from '@/utils/base';
import { FULL_NAME } from '@/utils/constants';
import { analytics } from '@/lib/analytics';
import CTASection from '@/components/CTASection';

export default function CTA() {
  return (
    <CTASection
      headingId='cta-heading'
      heading="Let's Build Something Great Together"
      description="Ready to discuss how I can help drive your team's success? I'm always excited to tackle new challenges and create meaningful impact."
      buttons={[
        {
          label: 'Get in touch',
          href: `${ABOUT_LINK.href}?scrollTo=${CONTACT_FORM_ID}`,
          ariaLabel: `Get in touch with ${FULL_NAME}`,
          onClick: () =>
            analytics.ctaClick('get_in_touch', '/about?scrollTo=contact-form'),
        },
        {
          label: 'View my work',
          href: PROJECTS_LINK.href,
          ariaLabel: `View ${FULL_NAME}'s work portfolio`,
          onClick: () => analytics.ctaClick('view_my_work', '/projects'),
        },
      ]}
    />
  );
}
