'use client';

import React from 'react';
import Button from '@/components/Button';
import { useTransitionRouter } from 'next-transition-router';
import { publicEnv, PublicEnvVars } from '@/lib/public.env';
import { A11Y } from '@/utils/constants';
import { devLog } from '@/utils/helpers';
import { captureRenderError, addBreadcrumb } from '@/lib/errorTracking';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error | null;
  errorInfo?: React.ErrorInfo | null;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{
    error?: Error | null;
    resetError: () => void;
  }>;
}

const ErrorComponent = ({
  resetError,
  error,
}: {
  resetError: () => void;
  error: Error | null;
}) => {
  const router = useTransitionRouter();

  return (
    <div
      className='min-h-screen flex items-center justify-center bg-background'
      role='alert'
      aria-live='assertive'
    >
      <div className='max-w-md w-full mx-auto p-6'>
        <div className='bg-card rounded-lg shadow-soft p-6 text-center'>
          <div className='size-16 mx-auto mb-4 bg-error-muted rounded-full flex items-center justify-center'>
            <svg
              className='size-8 text-error'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
              aria-hidden='true'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z'
              />
            </svg>
          </div>
          <h1 className='text-foreground'>Something went wrong</h1>
          <p className='text-foreground-muted mb-6'>{A11Y.ERROR_TEXT}</p>
          <div className='space-y-3'>
            <Button
              name='try-again'
              onClick={resetError}
              variant='primary'
              size='md'
              className='w-full'
              aria-label='Try to reload the application'
            >
              Try Again
            </Button>
            <Button
              name='refresh-page'
              onClick={router.refresh}
              variant='secondary'
              size='md'
              className='w-full'
              aria-label='Refresh the entire page'
            >
              Refresh Page
            </Button>
          </div>
          {publicEnv[PublicEnvVars.NEXT_PUBLIC_NODE_ENV] !== 'production' &&
            error && (
              <details className='mt-4 text-left'>
                <summary className='cursor-pointer text-sm text-foreground-muted hover:text-foreground'>
                  Error Details (Non-Production)
                </summary>
                <pre className='mt-2 text-sm bg-background-alt p-3 rounded overflow-auto'>
                  {error.stack}
                </pre>
              </details>
            )}
        </div>
      </div>
    </div>
  );
};

class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ error, errorInfo });

    devLog('Error caught by boundary:', error, errorInfo);

    // Capture error in Sentry with full component stack
    captureRenderError(error, errorInfo, 'ErrorBoundary');

    // Send error to analytics in production
    if (
      publicEnv[PublicEnvVars.NEXT_PUBLIC_NODE_ENV] === 'production' &&
      typeof window !== 'undefined' &&
      window.gtag
    ) {
      window.gtag('event', 'exception', {
        description: error.message,
        fatal: false,
      });
    }
  }

  resetError = () => {
    addBreadcrumb('User clicked Try Again after error', 'ui.click', {
      errorMessage: this.state.error?.message,
    });
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  override render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return (
          <FallbackComponent
            error={this.state.error || null}
            resetError={this.resetError}
          />
        );
      }

      return (
        <ErrorComponent
          error={this.state.error || null}
          resetError={this.resetError}
        />
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
