import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MagicLinkForm from '../MagicLinkForm';

const mockSignInWithOtp = jest.fn();

jest.mock('@/lib/supabase/auth-client', () => ({
  createAuthBrowserClient: () => ({
    auth: {
      signInWithOtp: (...args: unknown[]) => mockSignInWithOtp(...args),
    },
  }),
}));

// Stub window.location.origin (jsdom default is http://localhost)
beforeEach(() => {
  jest.clearAllMocks();
  mockSignInWithOtp.mockResolvedValue({ error: null });
  document.cookie = '';
});

describe('MagicLinkForm — idle state', () => {
  it('renders the sign-in heading and subtitle', () => {
    render(<MagicLinkForm next={undefined} />);

    expect(
      screen.getByRole('heading', { level: 1, name: /sign in/i })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/two clicks: enter your email/i)
    ).toBeInTheDocument();
  });

  it('renders the WyrdFold logo wrapped in a Link to "/"', () => {
    render(<MagicLinkForm next={undefined} />);
    const homeLink = screen.getByRole('link', { name: /wyrdfold home/i });
    expect(homeLink).toHaveAttribute('href', '/');
  });

  it('marks the email input with data-sentry-mask for PII redaction', () => {
    render(<MagicLinkForm next={undefined} />);
    const email = screen.getByRole('textbox', { name: /^email$/i });
    expect(email).toHaveAttribute('data-sentry-mask');
  });

  it('disables the submit button when the email is empty', () => {
    render(<MagicLinkForm next={undefined} />);
    expect(
      screen.getByRole('button', { name: /send magic link/i })
    ).toBeDisabled();
  });

  it('does not submit when the input is empty (HTML5 required)', async () => {
    render(<MagicLinkForm next={undefined} />);
    const button = screen.getByRole('button', { name: /send magic link/i });
    expect(button).toBeDisabled();
    expect(mockSignInWithOtp).not.toHaveBeenCalled();
  });

  it('calls Supabase signInWithOtp on submit with emailRedirectTo', async () => {
    const user = userEvent.setup();
    render(<MagicLinkForm next={undefined} />);

    await user.type(
      screen.getByRole('textbox', { name: /^email$/i }),
      'test@example.com'
    );
    await user.click(screen.getByRole('button', { name: /send magic link/i }));

    await waitFor(() => {
      expect(mockSignInWithOtp).toHaveBeenCalledTimes(1);
    });
    expect(mockSignInWithOtp).toHaveBeenCalledWith({
      email: 'test@example.com',
      options: {
        emailRedirectTo: expect.stringMatching(/\/auth\/callback$/),
        // Beta-only gate (#646) — block GoTrue from auto-creating users
        // for emails outside the invite list.
        shouldCreateUser: false,
      },
    });
  });

  it('stashes the next param in a cookie before submitting', async () => {
    const user = userEvent.setup();
    render(<MagicLinkForm next={'/jobs'} />);

    await user.type(
      screen.getByRole('textbox', { name: /^email$/i }),
      'test@example.com'
    );
    await user.click(screen.getByRole('button', { name: /send magic link/i }));

    await waitFor(() => {
      expect(mockSignInWithOtp).toHaveBeenCalled();
    });
    expect(document.cookie).toMatch(/wyrdfold_login_next=%2Fjobs/);
  });

  it('renders an error alert with aria-describedby on Supabase failure', async () => {
    mockSignInWithOtp.mockResolvedValueOnce({
      error: { message: 'Email rate limit exceeded' },
    });
    const user = userEvent.setup();
    render(<MagicLinkForm next={undefined} />);

    await user.type(
      screen.getByRole('textbox', { name: /^email$/i }),
      'test@example.com'
    );
    await user.click(screen.getByRole('button', { name: /send magic link/i }));

    // The persistent beta-warning Alert also exposes role='alert', so scope
    // to the inline error by its id rather than picking the first alert.
    const error = await screen.findByText(/rate limit exceeded/i);
    expect(error).toHaveAttribute('role', 'alert');
    expect(error).toHaveAttribute('id', 'login-error');
    expect(screen.getByRole('textbox', { name: /^email$/i })).toHaveAttribute(
      'aria-describedby',
      'login-error'
    );
  });
});

describe('MagicLinkForm — sent state', () => {
  it('renders "Check your email" heading and the masked email after success', async () => {
    const user = userEvent.setup();
    render(<MagicLinkForm next={undefined} />);

    await user.type(
      screen.getByRole('textbox', { name: /^email$/i }),
      'jane@example.com'
    );
    await user.click(screen.getByRole('button', { name: /send magic link/i }));

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: /check your email/i,
      })
    ).toBeInTheDocument();
    expect(screen.getByText('jane@example.com')).toBeInTheDocument();
  });

  it('disables the resend button initially with a countdown label', async () => {
    const user = userEvent.setup();
    render(<MagicLinkForm next={undefined} />);

    await user.type(
      screen.getByRole('textbox', { name: /^email$/i }),
      'jane@example.com'
    );
    await user.click(screen.getByRole('button', { name: /send magic link/i }));

    const resend = await screen.findByRole('button', { name: /resend in/i });
    expect(resend).toBeDisabled();
    expect(resend).toHaveTextContent(/resend in 30s/i);
  });

  it('disables the resend button while the cooldown is active', async () => {
    const user = userEvent.setup();
    render(<MagicLinkForm next={undefined} />);

    await user.type(
      screen.getByRole('textbox', { name: /^email$/i }),
      'jane@example.com'
    );
    await user.click(screen.getByRole('button', { name: /send magic link/i }));

    const resend = await screen.findByRole('button', { name: /resend in/i });
    // Cooldown is active immediately after send — resend is non-actionable.
    expect(resend).toBeDisabled();
    // Clicking a disabled button is a no-op — Supabase should not be re-called.
    await user.click(resend);
    expect(mockSignInWithOtp).toHaveBeenCalledTimes(1);
  });

  it('returns to the idle form when "Use a different email" is clicked', async () => {
    const user = userEvent.setup();
    render(<MagicLinkForm next={undefined} />);

    await user.type(
      screen.getByRole('textbox', { name: /^email$/i }),
      'jane@example.com'
    );
    await user.click(screen.getByRole('button', { name: /send magic link/i }));

    await screen.findByRole('heading', { name: /check your email/i });
    await user.click(
      screen.getByRole('button', { name: /use a different email/i })
    );

    expect(
      await screen.findByRole('heading', { level: 1, name: /sign in/i })
    ).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /^email$/i })).toHaveValue('');
  });
});
