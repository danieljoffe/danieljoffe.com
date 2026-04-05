import type { Metadata } from 'next';
import { Heading } from '@danieljoffe.com/shared-ui/Heading';
import { Text } from '@danieljoffe.com/shared-ui/Text';
import { HOME_LINK } from '@/utils/constants';
import { notFoundMetadata } from '@/data/metadata/notFound';
import Button from '@/components/Button';

export const metadata: Metadata = notFoundMetadata;

export default function NotFound() {
  return (
    <main>
      <div className='max-w-3xl mx-auto w-full px-4 sm:px-6 py-8 md:py-14'>
        <div className='flex flex-col items-center justify-center gap-6 min-h-[60vh] text-center'>
          <div className='flex flex-col gap-2'>
            <Heading variant='section' as='h1' className='text-text-secondary'>
              404
            </Heading>
            <Heading variant='section' as='h2'>
              Page Not Found
            </Heading>
            <Text variant='bodyLg' className='mb-6 max-w-md'>
              The page you are looking for could not be found. Please check the
              URL or return to the home page.
            </Text>
          </div>
          <Button
            as='link'
            href={HOME_LINK.href}
            aria-label='Return to home page'
          >
            Back to Home
          </Button>
        </div>
      </div>
    </main>
  );
}
