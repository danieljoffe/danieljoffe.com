import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import CompletionScreen from '../CompletionScreen';

expect.extend(toHaveNoViolations);

const mockPush = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ prefetch: jest.fn(), push: mockPush }),
}));

describe('CompletionScreen', () => {
  beforeEach(() => {
    mockPush.mockClear();
    global.fetch = jest.fn(() =>
      Promise.resolve({ ok: true, json: async () => ({}) })
    ) as jest.Mock;
  });

  it("renders the 'all set' heading", () => {
    render(<CompletionScreen />);
    expect(
      screen.getByRole('heading', { level: 2, name: /all set/i })
    ).toBeInTheDocument();
  });

  it('renders the supporting copy directing the user to targets', () => {
    render(<CompletionScreen />);
    expect(
      screen.getByText(/head to your targets to start tracking jobs/i)
    ).toBeInTheDocument();
  });

  it('renders the "Go to Targets" continue button', () => {
    render(<CompletionScreen />);
    expect(
      screen.getByRole('button', { name: /go to targets/i })
    ).toBeInTheDocument();
  });

  it('marks onboarding complete on click, then navigates to /targets', async () => {
    const user = userEvent.setup();
    render(<CompletionScreen />);

    await user.click(screen.getByRole('button', { name: /go to targets/i }));

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/targets'));
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/profile/onboarding/complete',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('still navigates to /targets when the complete call fails (network)', async () => {
    // Sentry catches the failure; the user shouldn't feel stuck on
    // the final screen because of a transient blip.
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('boom'));
    const user = userEvent.setup();
    render(<CompletionScreen />);

    await user.click(screen.getByRole('button', { name: /go to targets/i }));

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/targets'));
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<CompletionScreen />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
