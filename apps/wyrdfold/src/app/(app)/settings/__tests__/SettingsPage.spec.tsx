import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import SettingsPage from '../SettingsPage';

const mockToast = jest.fn();
jest.mock('@/state/Toast/ToastProvider', () => ({
  useToast: () => ({ toast: mockToast }),
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), prefetch: jest.fn() }),
}));

const NOTIFICATIONS = {
  job_notifications_enabled: false,
  job_score_threshold: 80,
  sms_notifications_enabled: false,
  sms_score_threshold: 90,
  sms_daily_limit: 5,
  phone_number: null,
  email: 'me@example.com',
  email_available: true,
  sms_available: true,
};

const IDENTITY = {
  name: 'Daniel',
  email: 'me@example.com',
  phone_number: null,
  location: null,
  linkedin_url: null,
  website_url: null,
};

const originalFetch = global.fetch;

beforeEach(() => {
  mockToast.mockReset();
  global.fetch = jest.fn().mockImplementation((url: string) => {
    if (url.includes('/notifications'))
      return Promise.resolve({
        ok: true,
        json: async () => NOTIFICATIONS,
      } as Response);
    if (url.includes('/identity'))
      return Promise.resolve({
        ok: true,
        json: async () => IDENTITY,
      } as Response);
    return Promise.resolve({ ok: false, json: async () => ({}) } as Response);
  }) as unknown as typeof fetch;
});

afterEach(() => {
  global.fetch = originalFetch;
});

describe('SettingsPage', () => {
  it('renders the Profile section once preferences load', async () => {
    render(<SettingsPage />);
    expect(await screen.findByText('Profile')).toBeInTheDocument();
    // Identity name pre-filled from server.
    const nameInput = (await screen.findByLabelText(
      /Name/i
    )) as HTMLInputElement;
    expect(nameInput.value).toBe('Daniel');
  });

  it('marks PII inputs with data-sentry-mask', async () => {
    render(<SettingsPage />);
    const nameInput = await screen.findByLabelText(/Name/i);
    expect(nameInput).toHaveAttribute('data-sentry-mask');
    const emailInput = await screen.findByLabelText(/^Email$/i);
    expect(emailInput).toHaveAttribute('data-sentry-mask');
  });

  it('renders the email + SMS notification sections when those channels are available', async () => {
    render(<SettingsPage />);
    // Several headings render — ensure both notification cards are present.
    expect(await screen.findByText(/email notifications/i)).toBeInTheDocument();
    expect(await screen.findByText(/sms notifications/i)).toBeInTheDocument();
  });
});
