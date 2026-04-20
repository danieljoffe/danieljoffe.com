import Link from 'next/link';
import { Heading } from '@danieljoffe.com/shared-ui/Heading';
import { Text } from '@danieljoffe.com/shared-ui/Text';
import { sectionContainer } from '@/lib/layoutStyles';
import URLInputForm from './URLInputForm';

interface ScanHeroProps {
  scanCount: number;
  avgScore: number | null;
  topViolation: string | null;
}

export default function ScanHero({
  scanCount,
  avgScore,
  topViolation,
}: ScanHeroProps) {
  return (
    <section className={sectionContainer} aria-labelledby='audit-hero-heading'>
      <div className='max-w-3xl mx-auto w-full px-4 sm:px-6 text-center py-20 md:py-32'>
        <div className='flex flex-col gap-6 items-center'>
          <div>
            <Heading variant='hero' id='audit-hero-heading'>
              Free website performance audit
            </Heading>
            <Text variant='subtitle' className='mt-4'>
              Paste your URL. <br />
              Get a detailed report in 30 seconds.
            </Text>
          </div>
          <URLInputForm />
          {scanCount > 0 && (
            <Text variant='caption'>
              {scanCount.toLocaleString()} sites audited
            </Text>
          )}
          {avgScore !== null && topViolation && (
            <div className='flex flex-col gap-1 items-center'>
              <Text variant='caption'>
                The average score is:{' '}
                <span className='font-bold'>{Math.round(avgScore)}/100</span>.
              </Text>
              <Text variant='caption'>
                The #1 issue: <span className='font-bold'>{topViolation}</span>.
              </Text>
              <Link
                href='/audit/insights'
                className='text-sm text-brand-500 hover:text-brand-600 underline underline-offset-2 mt-1'
              >
                View all insights
              </Link>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
