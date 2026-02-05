'use client';

import { Stack, PageContainer, Section } from '@danieljoffe.com/shared-ui';
import Button from '@/components/Button';

interface CTAButton {
  label: string;
  href: string;
  ariaLabel: string;
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
              aria-label={buttons[0].ariaLabel}
              onClick={buttons[0].onClick}
            >
              {buttons[0].label}
            </Button>
          ) : (
            <Stack direction='horizontal' gap='md'>
              {buttons.map((button, index) => (
                <Button
                  key={index}
                  as='link'
                  href={button.href}
                  aria-label={button.ariaLabel}
                  onClick={button.onClick}
                >
                  {button.label}
                </Button>
              ))}
            </Stack>
          )}
        </Stack>
      </PageContainer>
    </Section>
  );
}
