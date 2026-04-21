import { Heading } from '@danieljoffe.com/shared-ui/Heading';
import { Section } from '@danieljoffe.com/shared-ui/Section';
import { Text } from '@danieljoffe.com/shared-ui/Text';
import CalendlyButton from './CalendlyButton';

export default function CTASection() {
  return (
    <Section
      aria-labelledby='cta-heading'
      background='alt'
      center
      overflow='hidden'
      padding='lg'
      className='text-center'
    >
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
    </Section>
  );
}
