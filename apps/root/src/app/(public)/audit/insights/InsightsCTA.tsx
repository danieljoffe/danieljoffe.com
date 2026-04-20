import { Heading } from '@danieljoffe.com/shared-ui/Heading';
import { Text } from '@danieljoffe.com/shared-ui/Text';
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
    <section
      aria-labelledby='insights-cta-heading'
      className='w-full bg-surface-secondary py-16'
    >
      <div className='max-w-3xl mx-auto w-full px-4 sm:px-6 text-center'>
        <div className='flex flex-col gap-4 items-center'>
          <Heading variant='section' id='insights-cta-heading'>
            {topViolation
              ? `The #1 issue across ${totalScans.toLocaleString()} sites? ${topViolation}.`
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
      </div>
    </section>
  );
}
