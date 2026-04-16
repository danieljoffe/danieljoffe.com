'use client';

import dynamic from 'next/dynamic';
import { Spinner } from '@danieljoffe.com/shared-ui/Spinner';

const Form = dynamic(() => import('./Contact/Form'), {
  ssr: false,
  loading: () => (
    <div className='flex items-center justify-center py-12'>
      <Spinner size='sm' aria-label='Loading contact form' />
    </div>
  ),
});

export default function ContactForm() {
  return <Form />;
}
