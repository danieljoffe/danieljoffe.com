import { Heading } from '@danieljoffe/shared-ui/Heading';
import { Section } from '@danieljoffe/shared-ui/Section';
import { Text } from '@danieljoffe/shared-ui/Text';
import Button from '@/components/Button';

interface InsightsCTAProps {
  topViolation: string | null;
  totalScans: number;
}

export default function InsightsCTA({
  topViolation,
  totalScans,
}: InsightsCTAProps) {
  return (
    <Section
      aria-labelledby='insights-cta-heading'
      padding='lg'
      className='text-center'
    >
      <div className='flex flex-col gap-4 items-center'>
        <Heading variant='section' id='insights-cta-heading'>
          {topViolation
            ? `The #1 issue across ${totalScans.toLocaleString()} sites? "${topViolation}"`
            : 'Find out how your site stacks up.'}
        </Heading>
        <Text variant='bodyLg' className='max-w-md'>
          Run a free audit in 30 seconds, or talk to me about fixing what you
          find.
        </Text>
        <div className='flex gap-3 flex-wrap justify-center'>
          <Button as='link' href='/audit' name='cta-audit'>
            Run Free Audit
          </Button>
          <Button
            as='link'
            href='/services'
            variant='ghost'
            name='cta-services'
          >
            Performance Services
          </Button>
        </div>
      </div>
    </Section>
  );
}
