'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Stack, PageContainer, Section } from '@danieljoffe.com/shared-ui';
import { servicesFAQs } from '@/data/services';

function FAQItem({
  question,
  answer,
  isOpen,
  onToggle,
}: {
  question: string;
  answer: string;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className='border-b border-border'>
      <button
        type='button'
        className='w-full py-4 flex items-center justify-between text-left'
        onClick={onToggle}
        aria-expanded={isOpen}
      >
        <span className='font-medium'>{question}</span>
        <ChevronDown
          className={[
            'size-5 transition-transform duration-200',
            isOpen ? 'rotate-180' : '',
          ].join(' ')}
          aria-hidden='true'
        />
      </button>
      <div
        className={[
          'overflow-hidden transition-all duration-200',
          isOpen ? 'max-h-96 pb-4' : 'max-h-0',
        ].join(' ')}
      >
        <p className='text-foreground-muted'>{answer}</p>
      </div>
    </div>
  );
}

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <Section
      aria-labelledby='faq-heading'
      className='min-h-min max-h-max'
      background='alt'
    >
      <PageContainer className='max-w-[40rem]'>
        <h2 id='faq-heading' className='text-center'>
          Frequently Asked Questions
        </h2>
        <Stack direction='vertical' gap='none'>
          {servicesFAQs.map((faq, index) => (
            <FAQItem
              key={index}
              question={faq.question}
              answer={faq.answer}
              isOpen={openIndex === index}
              onToggle={() => setOpenIndex(openIndex === index ? null : index)}
            />
          ))}
        </Stack>
      </PageContainer>
    </Section>
  );
}
