import Link from 'next/link';
import { Heading } from '@danieljoffe/shared-ui/Heading';
import { Section } from '@danieljoffe/shared-ui/Section';
import { Text } from '@danieljoffe/shared-ui/Text';
import URLInputForm from './URLInputForm';

interface ScanHeroProps {
  scanCount: number;
  avgScore: number | null;
  topViolation: string | null;
  topViolationSlug: string | null;
}

export default function ScanHero({
  scanCount,
  avgScore,
  topViolation,
  topViolationSlug,
}: ScanHeroProps) {
  return (
    <Section
      aria-labelledby='audit-hero-heading'
      overflow='hidden'
      center
      padding='lg'
      className='text-center'
    >
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
        <div className='flex flex-col gap-1 items-center'>
          {scanCount > 0 && (
            <Text variant='caption'>
              Total sites audited:{' '}
              <span className='font-bold'>{scanCount.toLocaleString()}</span>
            </Text>
          )}
          {avgScore !== null && topViolation && (
            <>
              <Text variant='caption'>
                The average score is:{' '}
                <span className='font-bold'>{Math.round(avgScore)}/100</span>.
              </Text>
              <Text variant='caption'>
                The #1 issue:{' '}
                {topViolationSlug ? (
                  <Link
                    href={`/audit/insights/violations/${topViolationSlug}`}
                    className='font-bold underline underline-offset-2 decoration-border hover:decoration-brand-500 hover:text-brand-500 transition-colors'
                  >
                    &quot;{topViolation}&quot;
                  </Link>
                ) : (
                  <span className='font-bold'>&quot;{topViolation}&quot;</span>
                )}
                .
              </Text>
              <Link
                href='/audit/insights'
                className='text-sm text-brand-500 hover:text-brand-600 underline underline-offset-2 mt-1'
              >
                View all insights
              </Link>
            </>
          )}
        </div>
      </div>
    </Section>
  );
}
