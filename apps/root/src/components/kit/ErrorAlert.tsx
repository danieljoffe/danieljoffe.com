import { AlertCircle } from 'lucide-react';

export function ErrorAlert({
  message,
  onRetry,
  retryLabel = 'Try again',
}: {
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
}) {
  return (
    <div
      role='alert'
      className='relative rounded-lg border p-4 bg-error-light border-error/30 text-error'
    >
      <div className='flex gap-3'>
        <AlertCircle className='size-5 shrink-0 mt-0.5' />
        <div className='flex-1 text-sm text-text-secondary'>
          {message}
          {onRetry && (
            <button
              type='button'
              onClick={onRetry}
              className='block mt-2 text-sm font-medium underline hover:no-underline hover:cursor-pointer rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-error-light'
            >
              {retryLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
