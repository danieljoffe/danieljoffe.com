import { AlertTriangle } from 'lucide-react';
import Button from '@/components/Button';
import { sectionContainer, sectionInner } from '@/lib/layoutStyles';
import { Heading } from '@/components/kit';
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
            <Heading variant='section' id='scan-failed-heading'>
              Scan failed
            </Heading>
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
