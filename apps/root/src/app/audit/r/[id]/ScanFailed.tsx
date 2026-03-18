import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { PageContainer, Section, Stack } from '@danieljoffe.com/shared-ui';
import { friendlyErrorMessage } from './friendlyErrorMessage';

interface ScanFailedProps {
  url: string;
  errorMessage: string | null;
}

export default function ScanFailed({ url, errorMessage }: ScanFailedProps) {
  return (
    <Section
      className='min-h-min max-h-max'
      aria-labelledby='scan-failed-heading'
      background='alt'
    >
      <PageContainer className='py-20 md:py-32'>
        <Stack
          direction='vertical'
          align='center'
          gap='lg'
          className='text-center max-w-md mx-auto'
        >
          <div className='inline-flex items-center justify-center size-14 rounded-full bg-error/10'>
            <AlertTriangle className='size-7 text-error' aria-hidden='true' />
          </div>

          <div>
            <h1
              id='scan-failed-heading'
              className='font-sans text-2xl md:text-3xl font-semibold tracking-tight'
            >
              Scan failed
            </h1>
            <p className='text-text-secondary mt-2 truncate max-w-sm mx-auto'>
              {url}
            </p>
          </div>

          <p className='text-text-secondary'>
            {friendlyErrorMessage(errorMessage)}
          </p>

          <Link
            href='/audit'
            className='inline-flex items-center justify-center rounded-md bg-brand-500 px-6 py-3 text-text-inverse hover:bg-brand-600 transition'
          >
            Try again
          </Link>
        </Stack>
      </PageContainer>
    </Section>
  );
}
