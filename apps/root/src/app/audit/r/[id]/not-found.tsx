import Link from 'next/link';
import { PageContainer, Stack } from '@danieljoffe.com/shared-ui';

export default function NotFound() {
  return (
    <main>
      <PageContainer>
        <Stack
          direction='vertical'
          align='center'
          justify='center'
          gap='lg'
          className='min-h-[60vh] text-center'
        >
          <Stack direction='vertical' gap='sm'>
            <h1 className='text-text-secondary'>404</h1>
            <h2>Report Not Found</h2>
            <p className='text-text-secondary mb-6 max-w-md'>
              This scan may have expired or the URL is incorrect.
            </p>
          </Stack>
          <Link
            href='/audit'
            className='inline-flex items-center justify-center rounded-md bg-brand-500 px-6 py-3 text-text-inverse hover:bg-brand-600 transition'
          >
            Run a new audit
          </Link>
        </Stack>
      </PageContainer>
    </main>
  );
}
