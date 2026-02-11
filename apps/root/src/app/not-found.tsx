import { PageContainer, Stack } from '@danieljoffe.com/shared-ui';
import Button from '@/components/Button';
import type { Metadata } from 'next';
import { HOME_LINK } from '@/utils/constants';
import { notFoundMetadata } from '@/data/metadata/notFound';

export const metadata: Metadata = notFoundMetadata;

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
            <h1 className='text-foreground-muted'>404</h1>
            <h2>Page Not Found</h2>
            <p className='text-foreground-muted mb-6 max-w-md'>
              The page you are looking for could not be found. Please check the
              URL or return to the home page.
            </p>
          </Stack>

          <Button
            as='link'
            href={HOME_LINK.href}
            aria-label='Return to home page'
          >
            Back to Home
          </Button>
        </Stack>
      </PageContainer>
    </main>
  );
}
