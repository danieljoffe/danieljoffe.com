import CalendlyButton from './CalendlyButton';

export default function CTASection() {
  return (
    <section
      aria-labelledby='cta-heading'
      className='w-full bg-surface-secondary overflow-hidden flex flex-col justify-center'
    >
      <div className='max-w-3xl mx-auto w-full px-4 sm:px-6 text-center py-16'>
        <div className='flex flex-col gap-4 items-center'>
          <h2 id='cta-heading' className='font-sans text-3xl font-semibold'>
            Want these fixed?
          </h2>
          <p className='text-text-secondary max-w-md'>
            I help teams ship faster, more accessible websites. Let&apos;s talk
            about what&apos;s slowing yours down.
          </p>
          <CalendlyButton />
        </div>
      </div>
    </section>
  );
}
