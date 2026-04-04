import { sectionContainer } from '@/lib/layoutStyles';
import URLInputForm from './URLInputForm';

interface ScanHeroProps {
  scanCount: number;
}

export default function ScanHero({ scanCount }: ScanHeroProps) {
  return (
    <section className={sectionContainer} aria-labelledby='audit-hero-heading'>
      <div className='max-w-3xl mx-auto w-full px-4 sm:px-6 text-center py-20 md:py-32'>
        <div className='flex flex-col gap-6 items-center'>
          <div>
            <h1
              id='audit-hero-heading'
              className='text-4xl sm:text-5xl font-bold text-text-primary tracking-tight leading-[1.1]'
            >
              Free website performance audit
            </h1>
            <p className='text-lg text-text-secondary mt-4'>
              Paste your URL. <br />
              Get a detailed report in 30 seconds.
            </p>
          </div>
          <URLInputForm />
          {scanCount > 0 && (
            <p className='text-sm text-text-tertiary'>
              {scanCount.toLocaleString()} sites audited
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
