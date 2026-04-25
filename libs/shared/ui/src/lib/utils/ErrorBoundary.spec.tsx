import { render, screen } from '@testing-library/react';
import { ErrorBoundary } from './ErrorBoundary';

function ThrowingChild({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>Child content</div>;
}

describe('ErrorBoundary', () => {
  it('renders children when no error', () => {
    render(
      <ErrorBoundary>
        <div>Safe content</div>
      </ErrorBoundary>
    );
    expect(screen.getByText('Safe content')).toBeInTheDocument();
  });

  it('renders fallback when child throws', () => {
    render(
      <ErrorBoundary fallback={<div>Something went wrong</div>}>
        <ThrowingChild shouldThrow />
      </ErrorBoundary>
    );
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.queryByText('Child content')).not.toBeInTheDocument();
  });

  it('renders null when no fallback provided and child throws', () => {
    const { container } = render(
      <ErrorBoundary>
        <ThrowingChild shouldThrow />
      </ErrorBoundary>
    );
    expect(container.innerHTML).toBe('');
  });

  it('calls onError callback with error and errorInfo', () => {
    const handleError = jest.fn();
    render(
      <ErrorBoundary onError={handleError} fallback={<div>Error</div>}>
        <ThrowingChild shouldThrow />
      </ErrorBoundary>
    );
    expect(handleError).toHaveBeenCalledTimes(1);
    expect(handleError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ componentStack: expect.any(String) })
    );
  });

  it('logs to console in development', () => {
    const originalEnv = process.env['NODE_ENV'];
    process.env['NODE_ENV'] = 'development';
    const spy = jest.spyOn(console, 'error').mockImplementation();

    render(
      <ErrorBoundary fallback={<div>Error</div>}>
        <ThrowingChild shouldThrow />
      </ErrorBoundary>
    );

    expect(spy).toHaveBeenCalledWith(
      '[ErrorBoundary] Render error:',
      expect.any(Error),
      expect.objectContaining({ componentStack: expect.any(String) })
    );

    spy.mockRestore();
    process.env['NODE_ENV'] = originalEnv;
  });
});
