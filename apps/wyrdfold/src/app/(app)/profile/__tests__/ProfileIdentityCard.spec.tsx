import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import ProfileIdentityCard from '../ProfileIdentityCard';

const mockToast = jest.fn();
jest.mock('@/state/Toast/ToastProvider', () => ({
  useToast: () => ({ toast: mockToast }),
}));

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

describe('ProfileIdentityCard', () => {
  it('pre-fills inputs from /api/profile/identity', async () => {
    render(<ProfileIdentityCard />);
    // ``findByDisplayValue`` waits for the input to actually carry the value
    // (the component renders immediately with empty defaults, then setState
    // fires after the fetch resolves — ``findByLabelText`` would race that).
    expect(await screen.findByDisplayValue('Daniel')).toBeInTheDocument();
    expect(
      await screen.findByDisplayValue('me@example.com')
    ).toBeInTheDocument();
  });

  it('marks PII inputs with data-sentry-mask', async () => {
    render(<ProfileIdentityCard />);
    const nameInput = await screen.findByLabelText(/^Name\b/i);
    expect(nameInput).toHaveAttribute('data-sentry-mask');
    const emailInput = await screen.findByLabelText(/^Email$/i);
    expect(emailInput).toHaveAttribute('data-sentry-mask');
    const phoneInput = await screen.findByLabelText(/^Phone$/i);
    expect(phoneInput).toHaveAttribute('data-sentry-mask');
    const locationInput = await screen.findByLabelText(/^Location$/i);
    expect(locationInput).toHaveAttribute('data-sentry-mask');
  });
});
