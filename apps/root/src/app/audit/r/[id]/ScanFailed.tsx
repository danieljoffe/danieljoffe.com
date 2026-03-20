import { AlertTriangle } from 'lucide-react';
import Button from '@/components/Button';
import { friendlyErrorMessage } from './friendlyErrorMessage';

interface ScanFailedProps {
  url: string;
  errorMessage: string | null;
}

export default function ScanFailed({ url, errorMessage }: ScanFailedProps) {
  return (
    <section
      className='w-full bg-surface-secondary overflow-hidden flex flex-col justify-center'
      aria-labelledby='scan-failed-heading'
    >
      <div className='max-w-3xl mx-auto w-full px-4 sm:px-6 py-20 md:py-32'>
        <div className='flex flex-col gap-6 items-center text-center max-w-md mx-auto'>
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

          <Button as='link' href='/audit'>
            Try again
          </Button>
        </div>
      </div>
    </section>
  );
}
