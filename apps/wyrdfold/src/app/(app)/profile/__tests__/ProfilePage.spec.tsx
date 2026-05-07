import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import ProfilePage from '../ProfilePage';

const mockToast = jest.fn();
jest.mock('@/state/Toast/ToastProvider', () => ({
  useToast: () => ({ toast: mockToast }),
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), prefetch: jest.fn() }),
}));

// The conversation chat modal is gated by chatOpen and pulls in Anthropic /
// SSE plumbing. Stub it to keep the spec focused on the page shell.
jest.mock('@/app/_components/ConversationChatModal', () => ({
  __esModule: true,
  default: () => null,
}));

const originalFetch = global.fetch;

function jsonRes(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

beforeEach(() => {
  mockToast.mockReset();
});

afterEach(() => {
  global.fetch = originalFetch;
});

describe('ProfilePage', () => {
  it('renders the upload-resume zero state when no profile data exists', async () => {
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes('/optimized'))
        return Promise.resolve(jsonRes({ optimized: null }));
      if (url.includes('/gap-health'))
        return Promise.resolve(jsonRes({ tier: 'red', gaps: [] }));
      if (url.includes('/prose'))
        return Promise.resolve(jsonRes({ prose: null }));
      return Promise.resolve(jsonRes({}, 404));
    }) as unknown as typeof fetch;

    render(<ProfilePage />);

    expect(await screen.findByText(/Upload your resume/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Upload Resume/i })
    ).toBeInTheDocument();
  });

  it('toasts an error when the initial fetch rejects', async () => {
    global.fetch = jest
      .fn()
      .mockRejectedValue(new Error('network')) as unknown as typeof fetch;

    render(<ProfilePage />);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ variant: 'error' })
      );
    });
  });
});
