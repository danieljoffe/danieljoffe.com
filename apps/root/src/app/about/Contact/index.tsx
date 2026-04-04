import { sectionContainer } from '@/lib/layoutStyles';
import { Heading } from '@/components/kit';
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
        <p className='text-center !mb-2'>
          Available for contract work, consulting, and fractional engineering
          engagements. Have a project in mind? I&apos;d love to hear about it.
        </p>
        <p className='text-center text-sm font-medium'>
          <strong className='font-bold'>Response time:</strong> Usually within
          24 hours
        </p>
        <LazyForm />
      </div>
    </section>
  );
}
