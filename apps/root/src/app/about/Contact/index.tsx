import { PageContainer, Section } from '@danieljoffe.com/ui';
import Form from './Form';

export default function Contact() {
  return (
    <Section
      aria-labelledby='contact-heading'
      className='min-h-min max-h-max'
      background='alt'
    >
      <PageContainer>
        <h2 id='contact-heading' className='text-center'>
          Let&apos;s Connect
        </h2>
        <p className='text-center !mb-2'>
          Available for contract work, consulting, and fractional engineering
          engagements. Have a project in mind? I&apos;d love to hear about it.
        </p>
        <p className='text-center text-sm font-medium'>
          <strong className='font-bold'>Response time:</strong> Usually within
          24 hours
        </p>
        <Form />
      </PageContainer>
    </Section>
  );
}
