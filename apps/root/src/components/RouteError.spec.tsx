import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as Sentry from '@sentry/nextjs';
import RouteError from './RouteError';

jest.mock('@sentry/nextjs', () => ({
  withScope: jest.fn(callback => {
    const scope = {
      setTag: jest.fn(),
      setExtra: jest.fn(),
    };
    callback(scope);
  }),
  captureException: jest.fn(),
}));

describe('RouteError', () => {
  const baseProps = {
    error: new Error('boom'),
    reset: jest.fn(),
    route: '/blog',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the heading and default description', () => {
    render(<RouteError {...baseProps} />);
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(
      screen.getByText(/this page failed to load\. please try again\./i)
    ).toBeInTheDocument();
  });

  it('renders a custom description when provided', () => {
    render(<RouteError {...baseProps} description='Blog index crashed.' />);
    expect(screen.getByText('Blog index crashed.')).toBeInTheDocument();
  });

  it('calls reset when the Try again button is clicked', async () => {
    const user = userEvent.setup();
    const reset = jest.fn();
    render(<RouteError {...baseProps} reset={reset} />);

    await user.click(screen.getByRole('button', { name: /try again/i }));
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it('renders a Back to Home link', () => {
    render(<RouteError {...baseProps} />);
    const link = screen.getByRole('link', { name: /back to home/i });
    expect(link).toHaveAttribute('href', expect.stringMatching(/^\//));
  });

  it('reports the error to Sentry with the route tag', () => {
    render(<RouteError {...baseProps} />);
    expect(Sentry.withScope).toHaveBeenCalled();
    expect(Sentry.captureException).toHaveBeenCalledWith(baseProps.error);
  });

  it('sets the digest extra when the error carries a digest', () => {
    const error = Object.assign(new Error('digest error'), { digest: 'xyz' });
    render(<RouteError {...baseProps} error={error} />);

    const scopeCallback = (Sentry.withScope as jest.Mock).mock.calls[0][0];
    const scope = { setTag: jest.fn(), setExtra: jest.fn() };
    scopeCallback(scope);

    expect(scope.setTag).toHaveBeenCalledWith('route', '/blog');
    expect(scope.setExtra).toHaveBeenCalledWith('digest', 'xyz');
  });
});
