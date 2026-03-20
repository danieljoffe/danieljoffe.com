import Link from 'next/link';
import type { Metadata } from 'next';
import { HOME_LINK } from '@/utils/constants';
import { notFoundMetadata } from '@/data/metadata/notFound';

export const metadata: Metadata = notFoundMetadata;

export default function NotFound() {
  return (
    <main>
      <div className='max-w-3xl mx-auto w-full px-4 sm:px-6 py-8 md:py-14'>
        <div className='flex flex-col items-center justify-center gap-6 min-h-[60vh] text-center'>
          <div className='flex flex-col gap-2'>
            <h1 className='text-text-secondary'>404</h1>
            <h2>Page Not Found</h2>
            <p className='text-text-secondary mb-6 max-w-md'>
              The page you are looking for could not be found. Please check the
              URL or return to the home page.
            </p>
          </div>
          <Link
            href={HOME_LINK.href}
            aria-label='Return to home page'
            className='inline-flex items-center justify-center gap-2 rounded-md transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface bg-brand-500 text-white hover:bg-brand-600 active:bg-brand-700 px-4 py-3'
          >
            Back to Home
          </Link>
        </div>
      </div>
    </main>
  );
}
