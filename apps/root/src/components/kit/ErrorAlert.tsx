import { Alert } from '@danieljoffe.com/shared-ui/Alert';

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
    <Alert variant='error'>
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
    </Alert>
  );
}
