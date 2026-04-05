import { sectionContainer } from '@/lib/layoutStyles';
import { Heading, Text } from '@/components/kit';
import CalendlyButton from './CalendlyButton';

export default function CTASection() {
  return (
    <section aria-labelledby='cta-heading' className={sectionContainer}>
      <div className='max-w-3xl mx-auto w-full px-4 sm:px-6 text-center py-16'>
        <div className='flex flex-col gap-4 items-center'>
          <Heading variant='section' id='cta-heading'>
            Want these fixed?
          </Heading>
          <Text variant='bodyLg' className='max-w-md'>
            I help teams ship faster, more accessible websites. Let&apos;s talk
            about what&apos;s slowing yours down.
          </Text>
          <CalendlyButton />
        </div>
      </div>
    </section>
  );
}
