'use client';

import { ArrowUpRight } from 'lucide-react';
import { CALENDLY_URL } from '@/utils/constants';
import { analytics } from '@/lib/analytics';
import { KitLinkButton } from '@/components/kit';

export default function HeroCTA() {
  return (
    <KitLinkButton
      href={CALENDLY_URL}
      target='_blank'
      rel='noopener noreferrer'
      onClick={() => analytics.ctaClick('services_hero_cta', CALENDLY_URL)}
    >
      Book a Discovery Call
      <ArrowUpRight className='h-4 w-4' />
    </KitLinkButton>
  );
}
