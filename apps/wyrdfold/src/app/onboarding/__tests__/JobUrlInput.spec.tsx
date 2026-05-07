import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import JobUrlInput from '../JobUrlInput';

// JobUrlInput uses fetch at the network boundary; no other Next.js APIs.
// Button (used internally) doesn't render a link variant here, so no
// next/link or next/navigation mocks are needed.

const URL = 'https://jobs.example.com/posting/abc-123';

const fetchMock = jest.fn();
global.fetch = fetchMock as unknown as typeof fetch;

beforeEach(() => {
  fetchMock.mockReset();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('JobUrlInput', () => {
  it('renders the heading and a disabled submit button until input is filled', () => {
    render(<JobUrlInput onComplete={jest.fn()} onSkip={jest.fn()} />);
    expect(
      screen.getByRole('heading', { level: 2, name: /add your first job/i })
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^add job$/i })).toBeDisabled();
  });

  it('enables the submit button once the URL field has content', async () => {
    const user = userEvent.setup();
    render(<JobUrlInput onComplete={jest.fn()} onSkip={jest.fn()} />);
    await user.type(screen.getByLabelText(/job posting url/i), URL);
    expect(screen.getByRole('button', { name: /^add job$/i })).toBeEnabled();
  });

  it('does not POST when the input is empty', async () => {
    const user = userEvent.setup();
    render(<JobUrlInput onComplete={jest.fn()} onSkip={jest.fn()} />);
    // Click submit even though disabled — guard logic also bails early.
    const button = screen.getByRole('button', { name: /^add job$/i });
    await user.click(button);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('POSTs to /api/jobs/manual on submit and renders the extracted card', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        posting_id: 'p1',
        extracted: { title: 'Senior Engineer', company_name: 'Acme' },
      }),
    });
    const user = userEvent.setup();
    render(<JobUrlInput onComplete={jest.fn()} onSkip={jest.fn()} />);
    await user.type(screen.getByLabelText(/job posting url/i), URL);
    await user.click(screen.getByRole('button', { name: /^add job$/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/jobs/manual',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    const firstCall = fetchMock.mock.calls[0];
    if (!firstCall) throw new Error('expected fetch to have been called');
    const [, init] = firstCall;
    expect(JSON.parse((init as { body: string }).body)).toEqual({ url: URL });

    await waitFor(() => {
      expect(screen.getByText('Senior Engineer')).toBeInTheDocument();
    });
    expect(screen.getByText(/at Acme/i)).toBeInTheDocument();
  });

  it('calls onComplete with the extracted job data after a brief delay', async () => {
    jest.useFakeTimers();
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        posting_id: 'p1',
        extracted: { title: 'Senior Engineer', company_name: 'Acme' },
      }),
    });
    const onComplete = jest.fn();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<JobUrlInput onComplete={onComplete} onSkip={jest.fn()} />);

    await user.type(screen.getByLabelText(/job posting url/i), URL);
    await user.click(screen.getByRole('button', { name: /^add job$/i }));

    // Drain the awaited fetch + setState before advancing timers.
    await waitFor(() => {
      expect(screen.getByText('Senior Engineer')).toBeInTheDocument();
    });

    jest.advanceTimersByTime(1500);
    expect(onComplete).toHaveBeenCalledWith({
      postingId: 'p1',
      title: 'Senior Engineer',
    });
  });

  it('renders an error alert when the API returns a non-OK response', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 422,
      json: async () => ({ detail: 'Could not parse posting' }),
    });
    const user = userEvent.setup();
    render(<JobUrlInput onComplete={jest.fn()} onSkip={jest.fn()} />);
    await user.type(screen.getByLabelText(/job posting url/i), URL);
    await user.click(screen.getByRole('button', { name: /^add job$/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        /could not parse posting/i
      );
    });
  });

  it('falls back to a generic error message when the response has no body', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => {
        throw new Error('no body');
      },
    });
    const user = userEvent.setup();
    render(<JobUrlInput onComplete={jest.fn()} onSkip={jest.fn()} />);
    await user.type(screen.getByLabelText(/job posting url/i), URL);
    await user.click(screen.getByRole('button', { name: /^add job$/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/500/);
    });
  });

  it('invokes onSkip when "Skip for now" is clicked', async () => {
    const onSkip = jest.fn();
    const user = userEvent.setup();
    render(<JobUrlInput onComplete={jest.fn()} onSkip={onSkip} />);
    await user.click(screen.getByRole('button', { name: /skip for now/i }));
    expect(onSkip).toHaveBeenCalledTimes(1);
  });
});
