import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import OnboardingResetCard from '../OnboardingResetCard';

const mockPush = jest.fn();
const mockToast = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, prefetch: jest.fn() }),
}));

jest.mock('@/state/Toast/ToastProvider', () => ({
  useToast: () => ({ toast: mockToast }),
}));

describe('OnboardingResetCard', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockToast.mockClear();
    global.fetch = jest.fn() as jest.Mock;
    // Default: user confirms the dialog.
    jest.spyOn(window, 'confirm').mockReturnValue(true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders the heading + primary button', () => {
    render(<OnboardingResetCard />);
    expect(
      screen.getByText(/profile, targets, and saved jobs/i)
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Redo onboarding/i })
    ).toBeInTheDocument();
  });

  it('on click, confirms → POSTs reset → routes to /onboarding', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true });
    const user = userEvent.setup();
    render(<OnboardingResetCard />);

    await user.click(
      screen.getByRole('button', { name: /Redo onboarding/i })
    );

    expect(window.confirm).toHaveBeenCalled();
    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/profile/onboarding/reset',
        expect.objectContaining({ method: 'POST' })
      )
    );
    expect(mockPush).toHaveBeenCalledWith('/onboarding');
    expect(mockToast).not.toHaveBeenCalled();
  });

  it('aborts when the user cancels the confirm dialog', async () => {
    jest.spyOn(window, 'confirm').mockReturnValue(false);
    const user = userEvent.setup();
    render(<OnboardingResetCard />);

    await user.click(
      screen.getByRole('button', { name: /Redo onboarding/i })
    );

    expect(global.fetch).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('toasts an error and stays on the page when the server fails', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
    });
    const user = userEvent.setup();
    render(<OnboardingResetCard />);

    await user.click(
      screen.getByRole('button', { name: /Redo onboarding/i })
    );

    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ variant: 'error' })
      )
    );
    expect(mockPush).not.toHaveBeenCalled();
  });
});
