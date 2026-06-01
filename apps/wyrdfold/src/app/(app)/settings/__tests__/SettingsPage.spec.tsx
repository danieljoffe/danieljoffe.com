import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

const RESUME_STYLE = { preset: 'modern', accent: 'slate' };

const originalFetch = global.fetch;

interface FetchInit {
  method?: string;
  body?: string;
}

beforeEach(() => {
  mockToast.mockReset();
  global.fetch = jest
    .fn()
    .mockImplementation((url: string, init?: FetchInit) => {
      if (url.includes('/resume-style')) {
        // Echo PATCH bodies so the optimistic UI keeps the chosen value.
        if (init?.method === 'PATCH' && init.body) {
          const patched = JSON.parse(init.body) as Record<string, unknown>;
          return Promise.resolve({
            ok: true,
            json: async () => ({ ...RESUME_STYLE, ...patched }),
          } as Response);
        }
        return Promise.resolve({
          ok: true,
          json: async () => RESUME_STYLE,
        } as Response);
      }
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
  it('no longer renders the Identity card — moved to /profile', async () => {
    render(<SettingsPage />);
    // Wait for prefs to settle so the page has finished rendering its cards.
    expect(await screen.findByText(/email notifications/i)).toBeInTheDocument();
    // Pre-refactor "Profile" CardTitle is gone. Use a strict match so we don't
    // false-positive on "Profile" appearing in other strings (Sentry mask
    // attributes, etc.).
    expect(screen.queryByRole('heading', { name: /^Profile$/i })).toBeNull();
    expect(screen.queryByLabelText(/^Name$/i)).toBeNull();
  });

  it('renders the email + SMS notification sections when those channels are available', async () => {
    render(<SettingsPage />);
    // Several headings render — ensure both notification cards are present.
    expect(await screen.findByText(/email notifications/i)).toBeInTheDocument();
    expect(await screen.findByText(/sms notifications/i)).toBeInTheDocument();
  });

  it('renders the resume style card with the saved preset/accent and a preview', async () => {
    render(<SettingsPage />);
    expect(await screen.findByText(/resume style/i)).toBeInTheDocument();
    const presetSelect = screen.getByLabelText(/^Style$/i) as HTMLSelectElement;
    const accentSelect = screen.getByLabelText(
      /accent color/i
    ) as HTMLSelectElement;
    expect(presetSelect.value).toBe('modern');
    expect(accentSelect.value).toBe('slate');
    expect(
      screen.getByRole('img', { name: /resume style preview/i })
    ).toBeInTheDocument();
  });

  it('autosaves a PATCH when the preset changes', async () => {
    const user = userEvent.setup();
    render(<SettingsPage />);
    const presetSelect = await screen.findByLabelText(/^Style$/i);

    await user.selectOptions(presetSelect, 'classic');

    await waitFor(
      () => {
        const calls = (global.fetch as jest.Mock).mock.calls as [
          string,
          FetchInit?,
        ][];
        const patchCall = calls.find(
          ([url, init]) =>
            String(url).includes('/resume-style') && init?.method === 'PATCH'
        );
        expect(patchCall?.[1]?.body).toBeTruthy();
        expect(JSON.parse(patchCall?.[1]?.body ?? '{}')).toEqual({
          preset: 'classic',
          accent: 'slate',
        });
      },
      { timeout: 2000 }
    );
  });
});
