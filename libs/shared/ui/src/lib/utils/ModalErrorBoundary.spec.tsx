import { render, screen } from '@testing-library/react';
import { ModalErrorBoundary } from './ModalErrorBoundary';

function ThrowingChild({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('Modal error');
  }
  return <div>Modal content</div>;
}

describe('ModalErrorBoundary', () => {
  beforeEach(() => {
    document.body.style.overflow = '';
  });

  afterEach(() => {
    document.body.style.overflow = '';
  });

  it('renders children when no error', () => {
    render(
      <ModalErrorBoundary>
        <div>Modal content</div>
      </ModalErrorBoundary>
    );
    expect(screen.getByText('Modal content')).toBeInTheDocument();
  });

  it('renders fallback when child throws', () => {
    render(
      <ModalErrorBoundary fallback={<div>Modal error fallback</div>}>
        <ThrowingChild shouldThrow />
      </ModalErrorBoundary>
    );
    expect(screen.getByText('Modal error fallback')).toBeInTheDocument();
    expect(screen.queryByText('Modal content')).not.toBeInTheDocument();
  });

  it('restores document.body.style.overflow to unset on error', () => {
    document.body.style.overflow = 'hidden';

    render(
      <ModalErrorBoundary fallback={<div>Error</div>}>
        <ThrowingChild shouldThrow />
      </ModalErrorBoundary>
    );

    expect(document.body.style.overflow).toBe('unset');
  });

  it('logs to console in development', () => {
    const originalEnv = process.env['NODE_ENV'];
    process.env['NODE_ENV'] = 'development';
    const spy = jest.spyOn(console, 'error').mockImplementation();

    render(
      <ModalErrorBoundary fallback={<div>Error</div>}>
        <ThrowingChild shouldThrow />
      </ModalErrorBoundary>
    );

    expect(spy).toHaveBeenCalledWith(
      '[Modal] Render error:',
      expect.any(Error),
      expect.objectContaining({ componentStack: expect.any(String) })
    );

    spy.mockRestore();
    process.env['NODE_ENV'] = originalEnv;
  });
});
