import { PageContainer, Section, Stack } from '@danieljoffe.com/shared-ui';
import URLInputForm from './URLInputForm';

interface ScanHeroProps {
  scanCount: number;
}

export default function ScanHero({ scanCount }: ScanHeroProps) {
  return (
    <Section
      className='min-h-min max-h-max'
      aria-labelledby='audit-hero-heading'
      background='alt'
    >
      <PageContainer className='text-center max-w-[40rem] py-20 md:py-32'>
        <Stack direction='vertical' gap='lg' align='center'>
          <div>
            <h1
              id='audit-hero-heading'
              className='font-sans text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tight'
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
        </Stack>
      </PageContainer>
    </Section>
  );
}
