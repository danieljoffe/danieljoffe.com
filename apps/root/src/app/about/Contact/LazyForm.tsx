'use client';

import dynamic from 'next/dynamic';

const Form = dynamic(() => import('./Form'), {
  ssr: false,
  loading: () => (
    <div
      className='flex items-center justify-center min-h-52'
      role='status'
      aria-live='polite'
      aria-label='Loading content'
    >
      <div className='flex flex-col items-center gap-3'>
        <div className='flex gap-1.5'>
          {[0, 0.1, 0.2, 0.3].map((delay, i) => (
            <span
              key={i}
              className={`size-2 rounded-full ${i % 2 === 0 ? 'bg-brand-500' : 'bg-brand-500/60'} animate-bounce`}
              style={{ animationDelay: `${delay}s`, animationDuration: '0.6s' }}
            />
          ))}
        </div>
        <span className='text-sm text-text-secondary animate-pulse'>
          Loading...
        </span>
      </div>
    </div>
  ),
});

export default function LazyForm() {
  return <Form />;
}
