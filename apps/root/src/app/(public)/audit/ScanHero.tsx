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
          {avgScore !== null && topViolation && (
            <Text variant='body' className='max-w-md'>
              The average site scores{' '}
              <span className='font-bold'>{Math.round(avgScore)}/100</span>. The
              #1 issue? <span className='font-bold'>{topViolation}</span>.
            </Text>
          )}
          <URLInputForm />
          {scanCount > 0 && (
            <Text variant='caption'>
              {scanCount.toLocaleString()} sites audited
            </Text>
          )}
        </div>
      </div>
    </section>
  );
}
