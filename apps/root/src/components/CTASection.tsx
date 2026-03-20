import { type ReactNode } from 'react';

interface CTASectionProps {
  headingId: string;
  heading: string;
  description: string;
  children: ReactNode;
}

export default function CTASection({
  headingId,
  heading,
  description,
  children,
}: CTASectionProps) {
  return (
    <section
      className='w-full overflow-hidden flex flex-col justify-center'
      aria-labelledby={headingId}
    >
      <div className='max-w-[31rem] mx-auto w-full px-4 sm:px-6 py-8 md:py-14 text-center'>
        <h2 id={headingId}>{heading}</h2>
        <div className='flex flex-col gap-4 items-center self-center'>
          <p>{description}</p>
          {children}
        </div>
      </div>
    </section>
  );
}
