'use client';

import { ArrowUpRight } from 'lucide-react';
import { CALENDLY_URL } from '@/utils/constants';
import { analytics } from '@/lib/analytics';
import Button from '@/components/Button';

export default function HeroCTA() {
  return (
    <Button
      as='link'
      href={CALENDLY_URL}
      target='_blank'
      onClick={() => analytics.ctaClick('services_hero_cta', CALENDLY_URL)}
    >
      <span>Book a Discovery Call</span>
      <ArrowUpRight absoluteStrokeWidth={true} className='size-4' />
    </Button>
  );
}
