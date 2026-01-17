import Container from '@/components/Container';
import Section from '@/components/Section';
import Form from './Form';

export default function Contact() {
  return (
    <Section ariaLabelBy='contact-heading' className='bg-blue-500 text-white'>
      <Container>
        <h2 id='contact-heading' className='text-center'>
          Let&apos;s Connect
        </h2>
        <p className='text-center !mb-2'>
          I&apos;m currently seeking senior frontend or full-stack engineering
          roles—remote or LA-based. Whether you have an opportunity to discuss
          or just want to chat about performance optimization, I&apos;d love to
          hear from you.
        </p>
        <p className='text-center text-sm font-medium'>
          <strong className='font-bold'>Response time:</strong> Usually within
          24 hours
        </p>
        <Form />
      </Container>
    </Section>
  );
}
