'use client';

import dynamic from 'next/dynamic';

const Form = dynamic(() => import('@/app/about/Contact/Form'), {
  ssr: false,
  loading: () => (
    <div className='flex items-center justify-center py-12'>
      <div className='h-5 w-5 animate-spin rounded-full border-2 border-border border-t-brand-500' />
    </div>
  ),
});

export default function ContactForm() {
  return <Form />;
}
