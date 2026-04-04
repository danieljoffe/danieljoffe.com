import { AlertTriangle } from 'lucide-react';
import Button from '@/components/Button';
import { sectionContainer, sectionInner } from '@/lib/layoutStyles';
import { friendlyErrorMessage } from './friendlyErrorMessage';

interface ScanFailedProps {
  url: string;
  errorMessage: string | null;
}

export default function ScanFailed({ url, errorMessage }: ScanFailedProps) {
  return (
    <section className={sectionContainer} aria-labelledby='scan-failed-heading'>
      <div className={sectionInner}>
        <div className='flex flex-col gap-6 items-center text-center max-w-md mx-auto'>
          <div className='inline-flex items-center justify-center size-14 rounded-full bg-error/10'>
            <AlertTriangle className='size-7 text-error' aria-hidden='true' />
          </div>

          <div>
            <h1
              id='scan-failed-heading'
              className='text-2xl sm:text-3xl font-bold text-text-primary tracking-tight leading-[1.1]'
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
