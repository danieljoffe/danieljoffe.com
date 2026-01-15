import Container from '@/components/Container';
import Button from '@/components/Button';
import type { Metadata } from 'next';
import { HOME_LINK } from '@/utils/base';

export const metadata: Metadata = {
  title: 'Page Not Found - 404',
  description:
    'The page you are looking for could not be found. Please check the URL or return to the home page.',
  robots: {
    index: false,
    follow: false,
  },
  alternates: {
    canonical: '/404',
  },
};

export default function NotFound() {
  return (
    <Container>
      <div className='flex flex-col items-center justify-center gap-6 min-h-[60vh] text-center'>
        <div>
          <h1 className='text-6xl font-bold mb-4 text-neutral-600'>404</h1>
          <h2 className='text-2xl font-semibold mb-4'>Page Not Found</h2>
          <p className='text-lg text-neutral-600 mb-6 max-w-md'>
            The page you are looking for could not be found. Please check the
            URL or return to the home page.
          </p>
        </div>

        <Button
          as='link'
          href={HOME_LINK.href}
          aria-label='Return to home page'
        >
          Back to Home
        </Button>
      </div>
    </Container>
  );
}
