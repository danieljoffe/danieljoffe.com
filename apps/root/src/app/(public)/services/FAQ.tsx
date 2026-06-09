'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Text } from '@danieljoffe/shared-ui/Text';
import {
  FOCUS_RING,
  FOCUS_RING_OFFSET,
} from '@danieljoffe/shared-ui/styles/formStyles';
import { cn } from '@/lib/cn';
import { servicesFAQs } from '@/data/services';

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className='divide-y divide-border'>
      {servicesFAQs.map((faq, index) => (
        <div key={index}>
          <button
            type='button'
            className={`w-full py-4 flex items-center justify-between text-left cursor-pointer rounded-sm ${FOCUS_RING} ${FOCUS_RING_OFFSET}`}
            onClick={() => setOpenIndex(openIndex === index ? null : index)}
            aria-expanded={openIndex === index}
          >
            <span className='text-sm font-medium text-text-primary'>
              {faq.question}
            </span>
            <ChevronDown
              className={cn(
                'h-4 w-4 text-text-tertiary transition-transform duration-200 shrink-0 ml-2',
                openIndex === index && 'rotate-180'
              )}
              aria-hidden='true'
            />
          </button>
          <div
            className={cn(
              'overflow-hidden transition-all duration-200',
              openIndex === index ? 'max-h-96 pb-4' : 'max-h-0'
            )}
          >
            <Text variant='body'>{faq.answer}</Text>
          </div>
        </div>
      ))}
    </div>
  );
}
