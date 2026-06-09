import { AlertTriangle } from 'lucide-react';
import { Heading } from '@danieljoffe/shared-ui/Heading';
import { Section } from '@danieljoffe/shared-ui/Section';
import { Text } from '@danieljoffe/shared-ui/Text';
import Button from '@/components/Button';
import { friendlyErrorMessage } from './friendlyErrorMessage';

interface ScanFailedProps {
  url: string;
  errorMessage: string | null;
}

export default function ScanFailed({ url, errorMessage }: ScanFailedProps) {
  return (
    <Section
      aria-labelledby='scan-failed-heading'
      overflow='hidden'
      center
      padding='lg'
    >
      <div className='flex flex-col gap-6 items-center text-center max-w-md mx-auto'>
        <div className='inline-flex items-center justify-center size-14 rounded-full bg-error/10'>
          <AlertTriangle className='size-7 text-error' aria-hidden='true' />
        </div>

        <div>
          <Heading variant='section' id='scan-failed-heading'>
            Scan failed
          </Heading>
          <Text variant='bodyLg' className='mt-2 truncate max-w-sm mx-auto'>
            {url}
          </Text>
        </div>

        <Text variant='bodyLg'>{friendlyErrorMessage(errorMessage)}</Text>

        <Button as='link' href='/audit'>
          Try again
        </Button>
      </div>
    </Section>
  );
}
