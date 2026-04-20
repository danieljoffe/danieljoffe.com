import { PageLayout } from '@danieljoffe.com/shared-ui/PageLayout';
import { Heading } from '@danieljoffe.com/shared-ui/Heading';
import { Text } from '@danieljoffe.com/shared-ui/Text';
import Button from '@/components/Button';

export default function NotFound() {
  return (
    <PageLayout>
      <div className='max-w-3xl mx-auto w-full px-4 sm:px-6'>
        <div className='flex flex-col items-center justify-center gap-6 min-h-[60vh] text-center'>
          <div className='flex flex-col gap-2'>
            <Text variant='bodyLg' className='text-text-secondary' aria-hidden>
              404
            </Text>
            <Heading variant='section' as='h1'>
              Comparison Not Found
            </Heading>
            <Text variant='bodyLg' className='mb-6 max-w-md'>
              One or both of these scans are missing, incomplete, or scanned
              different URLs.
            </Text>
          </div>
          <Button as='link' href='/audit' name='new-audit'>
            Run a new audit
          </Button>
        </div>
      </div>
    </PageLayout>
  );
}
