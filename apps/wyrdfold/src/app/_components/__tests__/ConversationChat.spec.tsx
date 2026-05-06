import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import ConversationChat from '../ConversationChat';

const ORIGINAL_FETCH = global.fetch;

beforeEach(() => {
  jest.clearAllMocks();
});

afterAll(() => {
  global.fetch = ORIGINAL_FETCH;
});

describe('ConversationChat', () => {
  it('shows the Thinking spinner while the initial probe is loading', () => {
    // Hanging fetch — never resolves, so the loading state persists.
    global.fetch = jest
      .fn()
      .mockImplementation(
        () => new Promise(() => undefined)
      ) as unknown as typeof fetch;

    render(
      <ConversationChat onComplete={() => undefined} onSkip={() => undefined} />
    );

    expect(screen.getByLabelText(/thinking/i)).toBeInTheDocument();
  });

  it('renders the heading and the skip controls', () => {
    global.fetch = jest
      .fn()
      .mockImplementation(
        () => new Promise(() => undefined)
      ) as unknown as typeof fetch;

    render(
      <ConversationChat onComplete={() => undefined} onSkip={() => undefined} />
    );

    expect(
      screen.getByRole('heading', { level: 2, name: /build your profile/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /skip this question/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /skip for now/i })
    ).toBeInTheDocument();
  });

  it('renders the assistant probe message once the initial fetch resolves', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ question: 'Tell me about your most recent role.' }),
    }) as unknown as typeof fetch;

    render(
      <ConversationChat onComplete={() => undefined} onSkip={() => undefined} />
    );

    expect(
      await screen.findByText(/tell me about your most recent role/i)
    ).toBeInTheDocument();
  });

  it('shows an error state when the probe fetch fails', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: async () => ({}),
    }) as unknown as typeof fetch;

    render(
      <ConversationChat onComplete={() => undefined} onSkip={() => undefined} />
    );

    expect(
      await screen.findByText(/could not start conversation/i)
    ).toBeInTheDocument();
  });

  it('marks the textarea with data-sentry-mask for PII redaction', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ question: 'Hi.' }),
    }) as unknown as typeof fetch;

    render(
      <ConversationChat onComplete={() => undefined} onSkip={() => undefined} />
    );

    const textarea = await screen.findByRole('textbox', {
      name: /your response/i,
    });
    expect(textarea).toHaveAttribute('data-sentry-mask');
  });
});
