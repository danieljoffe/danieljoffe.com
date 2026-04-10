import { Heading } from '@danieljoffe.com/shared-ui/Heading';
import { Text } from '@danieljoffe.com/shared-ui/Text';
import { sectionContainer } from '@/lib/layoutStyles';
import LazyForm from './LazyForm';

export default function Contact() {
  return (
    <section aria-labelledby='contact-heading' className={sectionContainer}>
      <div className='max-w-3xl mx-auto w-full px-4 sm:px-6 py-8 md:py-14'>
        <Heading
          variant='section'
          as='h2'
          id='contact-heading'
          className='text-center'
        >
          Let&apos;s figure out if I&apos;m the right fit.
        </Heading>
        <Text variant='bodyLg' className='text-center !mb-2'>
          Tell me about your project. I respond within 24 hours, and I&apos;ll
          be upfront about whether I can actually help.
        </Text>
        <Text variant='body' as='p' className='text-center font-medium'>
          <strong className='font-bold'>Response time:</strong> Usually within
          24 hours
        </Text>
        <LazyForm />
      </div>
    </section>
  );
}
