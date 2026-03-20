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
      size='sm'
      onClick={() => analytics.ctaClick('services_hero_cta', CALENDLY_URL)}
    >
      Book a Discovery Call
      <ArrowUpRight className='h-4 w-4' />
    </Button>
  );
}
