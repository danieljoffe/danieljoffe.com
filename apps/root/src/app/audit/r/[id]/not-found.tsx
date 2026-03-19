import Link from 'next/link';

export default function NotFound() {
  return (
    <main>
      <div className='max-w-3xl mx-auto w-full px-4 sm:px-6'>
        <div className='flex flex-col items-center justify-center gap-6 min-h-[60vh] text-center'>
          <div className='flex flex-col gap-2'>
            <h1 className='text-text-secondary'>404</h1>
            <h2>Report Not Found</h2>
            <p className='text-text-secondary mb-6 max-w-md'>
              This scan may have expired or the URL is incorrect.
            </p>
          </div>
          <Link
            href='/audit'
            className='inline-flex items-center justify-center rounded-md bg-brand-500 px-6 py-3 text-text-inverse hover:bg-brand-600 transition'
          >
            Run a new audit
          </Link>
        </div>
      </div>
    </main>
  );
}
