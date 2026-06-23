import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Form from './Form';

// Capture toast + router calls so success/error branches can be asserted.
const mockToast = jest.fn();
const mockPush = jest.fn();

jest.mock('@/state/Toast/ToastProvider', () => ({
  useToast: () => ({ toast: mockToast }),
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Stub analytics + error tracking — they are fire-and-forget side effects.
jest.mock('@/lib/analytics', () => ({
  analytics: {
    formStart: jest.fn(),
    formEngage: jest.fn(),
    formSubmit: jest.fn(),
    formError: jest.fn(),
  },
}));

jest.mock('@/lib/errorTracking', () => ({
  captureFormError: jest.fn(),
  addBreadcrumb: jest.fn(),
}));

// Render hCaptcha as a button that solves the captcha via onVerify when clicked,
// so the success/failure submit branches can be reached.
jest.mock('@hcaptcha/react-hcaptcha', () => ({
  __esModule: true,
  default: ({ onVerify }: { onVerify: (token: string) => void }) => (
    <button type='button' onClick={() => onVerify('test-token')}>
      Solve captcha
    </button>
  ),
}));

/**
 * The component lazy-loads hCaptcha behind an IntersectionObserver. Override the
 * global stub so it reports an immediate intersection, mounting the (mocked)
 * captcha widget.
 */
function mockIntersectingObserver() {
  class ImmediateObserver implements IntersectionObserver {
    readonly root: Element | Document | null = null;
    readonly rootMargin = '';
    readonly thresholds: ReadonlyArray<number> = [];
    constructor(private cb: IntersectionObserverCallback) {}
    observe(): void {
      this.cb(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        this as unknown as IntersectionObserver
      );
    }
    disconnect(): void {}
    unobserve(): void {}
    takeRecords(): IntersectionObserverEntry[] {
      return [];
    }
  }
  (
    global as unknown as { IntersectionObserver: typeof IntersectionObserver }
  ).IntersectionObserver =
    ImmediateObserver as unknown as typeof IntersectionObserver;
}

async function fillValidFields(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/name/i), 'Jane Smith');
  await user.type(screen.getByLabelText(/email/i), 'jane@example.com');
  await user.type(
    screen.getByLabelText(/message/i),
    'I would like to discuss a project with you.'
  );
}

describe('Contact Form', () => {
  afterEach(() => {
    jest.clearAllMocks();
    delete (global as { fetch?: unknown }).fetch;
  });

  it('renders the required form fields and submit button', () => {
    render(<Form />);
    expect(screen.getByLabelText(/name/i)).toBeRequired();
    expect(screen.getByLabelText(/email/i)).toBeRequired();
    expect(screen.getByLabelText(/message/i)).toBeRequired();
    expect(screen.getByRole('button', { name: /send message/i })).toBeEnabled();
  });

  it('shows validation errors when submitting empty fields', async () => {
    const user = userEvent.setup();
    render(<Form />);

    await user.click(screen.getByRole('button', { name: /send message/i }));

    await waitFor(() => {
      expect(screen.getByLabelText(/name/i)).toHaveAttribute(
        'aria-invalid',
        'true'
      );
    });
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('asks for captcha completion when fields are valid but captcha is missing', async () => {
    const user = userEvent.setup();
    render(<Form />);

    await fillValidFields(user);
    await user.click(screen.getByRole('button', { name: /send message/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/captcha/i);
    });
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('submits successfully and redirects to the thank-you page', async () => {
    mockIntersectingObserver();
    const fetchMock = jest.fn().mockResolvedValue({ ok: true } as Response);
    (global as { fetch: unknown }).fetch = fetchMock;

    const user = userEvent.setup();
    render(<Form />);

    await fillValidFields(user);
    await user.click(
      await screen.findByRole('button', { name: /solve captcha/i })
    );
    await user.click(screen.getByRole('button', { name: /send message/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/email/contact',
        expect.objectContaining({ method: 'POST' })
      );
    });
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ variant: 'success' })
    );
    expect(mockPush).toHaveBeenCalledWith('/thank-you/email');
  });

  it('surfaces an error toast and message when the request fails', async () => {
    mockIntersectingObserver();
    const fetchMock = jest.fn().mockResolvedValue({ ok: false } as Response);
    (global as { fetch: unknown }).fetch = fetchMock;

    const user = userEvent.setup();
    render(<Form />);

    await fillValidFields(user);
    await user.click(
      await screen.findByRole('button', { name: /solve captcha/i })
    );
    await user.click(screen.getByRole('button', { name: /send message/i }));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ variant: 'error' })
      );
    });
    expect(screen.getByRole('alert')).toHaveTextContent(/failed to send/i);
    expect(mockPush).not.toHaveBeenCalled();
  });
});
