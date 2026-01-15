import Container from '@/components/Container';
import Form from './Form';

export default function Contact() {
  return (
    <Container className='bg-blue-500 text-white contact-form'>
      <div className='flex flex-col gap-4 w-full max-w-[32rem] self-center'>
        <h2 id='contact-heading' className='text-center'>
          Let&apos;s Connect
        </h2>
        <Form />
      </div>
    </Container>
  );
}
