import { sectionContainer } from '@/lib/layoutStyles';
import { Heading, Text } from '@/components/kit';
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
          Let&apos;s Connect
        </Heading>
        <Text variant='bodyLg' className='text-center !mb-2'>
          Available for contract work, consulting, and fractional engineering
          engagements. Have a project in mind? I&apos;d love to hear about it.
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
