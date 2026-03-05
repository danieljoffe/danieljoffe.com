import { type ReactNode } from 'react';
import { Stack, PageContainer, Section } from '@danieljoffe.com/shared-ui';

interface CTASectionProps {
  headingId: string;
  heading: string;
  description: string;
  children: ReactNode;
}

export default function CTASection({
  headingId,
  heading,
  description,
  children,
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
          {children}
        </Stack>
      </PageContainer>
    </Section>
  );
}
