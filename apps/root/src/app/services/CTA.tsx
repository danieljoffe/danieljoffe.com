'use client';

import { CALENDLY_URL } from '@/utils/base';
import { FULL_NAME } from '@/utils/constants';
import { analytics } from '@/lib/analytics';
import CTASection from '@/components/CTASection';

export default function CTA() {
  return (
    <CTASection
      headingId='services-cta-heading'
      heading="Let's figure out how I can help."
      description='Book a free 30-minute call. No contracts, no commitments—just a conversation about your frontend challenges.'
      buttons={[
        {
          label: 'Book a Discovery Call',
          href: CALENDLY_URL,
          ariaLabel: `Book a discovery call with ${FULL_NAME}`,
          onClick: () =>
            analytics.ctaClick('services_cta_discovery_call', CALENDLY_URL),
        },
      ]}
    />
  );
}
