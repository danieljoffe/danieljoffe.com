'use client';

import { ArrowUpRight } from 'lucide-react';
import { CALENDLY_URL } from '@/utils/constants';
import { analytics } from '@/lib/analytics';

export default function HeroCTA() {
  return (
    <a
      href={CALENDLY_URL}
      target='_blank'
      rel='noopener noreferrer'
      onClick={() => analytics.ctaClick('services_hero_cta', CALENDLY_URL)}
      className='inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition-colors'
    >
      Book a Discovery Call
      <ArrowUpRight className='h-4 w-4' />
    </a>
  );
}
