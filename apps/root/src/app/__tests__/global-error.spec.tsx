import { render, screen, fireEvent } from '@testing-library/react';
import * as Sentry from '@sentry/nextjs';
import GlobalError from '../global-error';

jest.mock('@sentry/nextjs', () => ({
  withScope: jest.fn(callback => {
    const mockScope = {
      setLevel: jest.fn(),
      setTag: jest.fn(),
      setExtra: jest.fn(),
    };
    callback(mockScope);
  }),
  captureException: jest.fn(),
}));

describe('GlobalError', () => {
  const mockReset = jest.fn();
  const mockError = new Error('Test error');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders error message and try again button', () => {
    render(<GlobalError error={mockError} reset={mockReset} />);

    expect(screen.getByText('Something went wrong!')).toBeInTheDocument();
    expect(
      screen.getByText(/an unexpected error occurred/i)
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /try again/i })
    ).toBeInTheDocument();
  });

  it('calls reset when try again is clicked', () => {
    render(<GlobalError error={mockError} reset={mockReset} />);

    fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(mockReset).toHaveBeenCalledTimes(1);
  });

  it('reports error to Sentry on mount', () => {
    render(<GlobalError error={mockError} reset={mockReset} />);

    expect(Sentry.withScope).toHaveBeenCalled();
    expect(Sentry.captureException).toHaveBeenCalledWith(mockError);
  });

  it('includes digest in Sentry scope when present', () => {
    const errorWithDigest = Object.assign(new Error('Digest error'), {
      digest: 'abc123',
    });

    render(<GlobalError error={errorWithDigest} reset={mockReset} />);

    expect(Sentry.withScope).toHaveBeenCalled();
    const scopeCallback = (Sentry.withScope as jest.Mock).mock.calls[0][0];
    const mockScope = {
      setLevel: jest.fn(),
      setTag: jest.fn(),
      setExtra: jest.fn(),
    };
    scopeCallback(mockScope);

    expect(mockScope.setExtra).toHaveBeenCalledWith('digest', 'abc123');
  });
});
