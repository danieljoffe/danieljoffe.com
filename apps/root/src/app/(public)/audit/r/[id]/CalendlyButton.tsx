'use client';

import Button from '@/components/Button';
import { analytics } from '@/lib/analytics';
import { CALENDLY_URL } from '@/utils/constants';

export default function CalendlyButton() {
  return (
    <Button
      as='link'
      href={CALENDLY_URL}
      variant='primary'
      size='md'
      name='calendly-discovery-call'
      onClick={() => analytics.auditCalendlyClicked()}
    >
      Book a free discovery call
    </Button>
  );
}
