import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from '@testing-library/react';
import LoginForm from './LoginForm';

const mockReplace = jest.fn();
const mockRefresh = jest.fn();
const mockSearchParamsGet = jest.fn<string | null, [string]>();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: (...args: unknown[]) => mockReplace(...args),
    refresh: () => mockRefresh(),
    prefetch: jest.fn(),
    back: jest.fn(),
  }),
  useSearchParams: () => ({
    get: (key: string) => mockSearchParamsGet(key),
  }),
}));

const originalFetch = global.fetch;

describe('LoginForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
    mockSearchParamsGet.mockReturnValue(null);
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('renders the password input and submit button', () => {
    render(<LoginForm />);
    expect(screen.getByLabelText(/admin password/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /sign in/i })
    ).toBeInTheDocument();
  });

  it('disables submit when password is empty', () => {
    render(<LoginForm />);
    expect(screen.getByRole('button', { name: /sign in/i })).toBeDisabled();
  });

  it('submits password and redirects on success (happy path)', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
    });

    render(<LoginForm />);
    const input = screen.getByLabelText(/admin password/i);

    await act(async () => {
      fireEvent.change(input, { target: { value: 'secret' } });
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/tools/login',
        expect.objectContaining({ method: 'POST' })
      );
      expect(mockReplace).toHaveBeenCalledWith('/tools/admin');
    });
  });

  it('redirects to sanitized next param on success', async () => {
    mockSearchParamsGet.mockReturnValue('/tools/admin/jobs');
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
    });

    render(<LoginForm />);
    const input = screen.getByLabelText(/admin password/i);

    await act(async () => {
      fireEvent.change(input, { target: { value: 'secret' } });
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    });

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/tools/admin/jobs');
    });
  });

  it('rejects protocol-relative next param and falls back to /tools/admin', async () => {
    mockSearchParamsGet.mockReturnValue('//evil.com');
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
    });

    render(<LoginForm />);
    const input = screen.getByLabelText(/admin password/i);

    await act(async () => {
      fireEvent.change(input, { target: { value: 'secret' } });
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    });

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/tools/admin');
    });
  });

  it('shows an error message on invalid password (401)', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ error: 'Invalid password' }),
    });

    render(<LoginForm />);
    const input = screen.getByLabelText(/admin password/i);

    await act(async () => {
      fireEvent.change(input, { target: { value: 'wrong' } });
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    });

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/invalid password/i);
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('shows lockout countdown on 429 with retryAfterSeconds', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 429,
      json: () => Promise.resolve({ retryAfterSeconds: 90 }),
    });

    render(<LoginForm />);
    const input = screen.getByLabelText(/admin password/i);

    await act(async () => {
      fireEvent.change(input, { target: { value: 'wrong' } });
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    });

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/too many attempts/i);
    expect(alert).toHaveTextContent(/1:30/);
    // Input disabled during lockout
    expect(input).toBeDisabled();
  });

  it('shows generic error on network failure', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('boom'));

    render(<LoginForm />);
    const input = screen.getByLabelText(/admin password/i);

    await act(async () => {
      fireEvent.change(input, { target: { value: 'secret' } });
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    });

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/failed to sign in/i);
  });
});
