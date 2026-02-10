'use client';

import { type ReactNode } from 'react';
import { Stack, PageContainer, Section } from '@danieljoffe.com/shared-ui';
import Button from '@/components/Button';

interface CTAButton {
  label: string;
  href: string;
  ariaLabel: string;
  target?: string;
  icon?: ReactNode;
  onClick?: () => void;
}

interface CTASectionProps {
  headingId: string;
  heading: string;
  description: string;
  buttons: CTAButton[];
}

export default function CTASection({
  headingId,
  heading,
  description,
  buttons,
}: CTASectionProps) {
  return (
    <Section className='min-h-min max-h-max' aria-labelledby={headingId}>
      <PageContainer className='text-center max-w-[31rem]'>
        <h2 id={headingId}>{heading}</h2>
        <Stack
          direction='vertical'
          gap='md'
          align='center'
          className='self-center'
        >
          <p>{description}</p>
          {buttons.length === 1 ? (
            <Button
              as='link'
              href={buttons[0].href}
              target={buttons[0].target}
              aria-label={buttons[0].ariaLabel}
              onClick={buttons[0].onClick}
              className='font-semibold'
            >
              <span>{buttons[0].label}</span>
              {buttons[0].icon}
            </Button>
          ) : (
            <Stack direction='horizontal' gap='md'>
              {buttons.map((button, index) => (
                <Button
                  key={index}
                  as='link'
                  href={button.href}
                  target={button.target}
                  aria-label={button.ariaLabel}
                  onClick={button.onClick}
                  className='font-semibold'
                >
                  <span>{button.label}</span>
                  {button.icon}
                </Button>
              ))}
            </Stack>
          )}
        </Stack>
      </PageContainer>
    </Section>
  );
}
