import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AddReferenceJDModal from '../AddReferenceJDModal';

const mockToast = jest.fn();
jest.mock('@/state/Toast/ToastProvider', () => ({
  useToast: () => ({ toast: mockToast }),
}));

const ORIGINAL_FETCH = global.fetch;

beforeEach(() => {
  jest.clearAllMocks();
});

afterAll(() => {
  global.fetch = ORIGINAL_FETCH;
});

describe('AddReferenceJDModal', () => {
  it('renders nothing when closed', () => {
    render(
      <AddReferenceJDModal
        isOpen={false}
        onClose={() => undefined}
        targetId='t-1'
        onAdded={() => undefined}
      />
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders the JD textarea and an optional source URL field when open', () => {
    render(
      <AddReferenceJDModal
        isOpen
        onClose={() => undefined}
        targetId='t-1'
        onAdded={() => undefined}
      />
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(
      screen.getByRole('textbox', { name: /job description text/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('textbox', { name: /source url/i })
    ).toBeInTheDocument();
  });

  it('disables Add until at least 50 characters are entered', async () => {
    const user = userEvent.setup();
    render(
      <AddReferenceJDModal
        isOpen
        onClose={() => undefined}
        targetId='t-1'
        onAdded={() => undefined}
      />
    );
    const submit = screen.getByRole('button', { name: /^add$/i });
    expect(submit).toBeDisabled();

    await user.type(
      screen.getByRole('textbox', { name: /job description text/i }),
      'too short'
    );
    expect(submit).toBeDisabled();
    expect(
      screen.getByText(/minimum 50 characters required/i)
    ).toBeInTheDocument();
  });

  it('POSTs the JD when valid and invokes onAdded on success', async () => {
    const onAdded = jest.fn();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    }) as unknown as typeof fetch;

    const user = userEvent.setup();
    render(
      <AddReferenceJDModal
        isOpen
        onClose={() => undefined}
        targetId='t-1'
        onAdded={onAdded}
      />
    );

    const longText = 'a'.repeat(60);
    await user.type(
      screen.getByRole('textbox', { name: /job description text/i }),
      longText
    );
    await user.click(screen.getByRole('button', { name: /^add$/i }));

    await waitFor(() => {
      expect(onAdded).toHaveBeenCalledTimes(1);
    });
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/targets/t-1/reference-jds',
      expect.objectContaining({ method: 'POST' })
    );
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ variant: 'success' })
    );
  });

  it('toasts an error when the server rejects the submission', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ detail: 'bad request' }),
    }) as unknown as typeof fetch;

    const user = userEvent.setup();
    render(
      <AddReferenceJDModal
        isOpen
        onClose={() => undefined}
        targetId='t-1'
        onAdded={() => undefined}
      />
    );
    const longText = 'a'.repeat(60);
    await user.type(
      screen.getByRole('textbox', { name: /job description text/i }),
      longText
    );
    await user.click(screen.getByRole('button', { name: /^add$/i }));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ variant: 'error' })
      );
    });
  });

  it('closes via Escape key when not saving', async () => {
    const onClose = jest.fn();
    const user = userEvent.setup();
    render(
      <AddReferenceJDModal
        isOpen
        onClose={onClose}
        targetId='t-1'
        onAdded={() => undefined}
      />
    );
    await user.keyboard('{Escape}');
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });
});
