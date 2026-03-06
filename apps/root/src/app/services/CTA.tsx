import { ArrowUpRight } from 'lucide-react';
import { CALENDLY_URL, FULL_NAME } from '@/utils/constants';
import CTASection from '@/components/CTASection';
import CTAButton from '@/components/CTAButton';

export default function CTA() {
  return (
    <CTASection
      headingId='services-cta-heading'
      heading="Let's figure out how I can help."
      description='Book a free 30-minute call. No contracts, no commitments—just a conversation about your frontend challenges.'
    >
      <CTAButton
        href={CALENDLY_URL}
        target='_blank'
        ariaLabel={`Book a discovery call with ${FULL_NAME}`}
        analyticsId='services_cta_discovery_call'
      >
        <span>Book a Discovery Call</span>
        <ArrowUpRight absoluteStrokeWidth={true} className='size-4' />
      </CTAButton>
    </CTASection>
  );
}
