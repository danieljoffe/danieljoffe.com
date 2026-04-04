import Button from '@/components/Button';
import { Heading, Text } from '@/components/kit';

export default function NotFound() {
  return (
    <main>
      <div className='max-w-3xl mx-auto w-full px-4 sm:px-6'>
        <div className='flex flex-col items-center justify-center gap-6 min-h-[60vh] text-center'>
          <div className='flex flex-col gap-2'>
            <Heading variant='section' as='h1' className='text-text-secondary'>
              404
            </Heading>
            <Heading variant='section' as='h2'>
              Report Not Found
            </Heading>
            <Text variant='bodyLg' className='mb-6 max-w-md'>
              This scan may have expired or the URL is incorrect.
            </Text>
          </div>
          <Button as='link' href='/audit'>
            Run a new audit
          </Button>
        </div>
      </div>
    </main>
  );
}
