import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from '@testing-library/react';
import PasswordGate from './PasswordGate';

const originalFetch = global.fetch;

describe('PasswordGate', () => {
  const mockOnAuth = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
    global.fetch = jest.fn();
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('renders password input and submit button', () => {
    render(<PasswordGate onAuthenticated={mockOnAuth} />);
    expect(screen.getByLabelText(/admin password/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /sign in/i })
    ).toBeInTheDocument();
  });

  it('disables submit when password is empty', () => {
    render(<PasswordGate onAuthenticated={mockOnAuth} />);
    expect(screen.getByRole('button', { name: /sign in/i })).toBeDisabled();
  });

  it('calls onAuthenticated on successful verify', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ valid: true }),
    });

    render(<PasswordGate onAuthenticated={mockOnAuth} />);

    fireEvent.change(screen.getByLabelText(/admin password/i), {
      target: { value: 'correct-pass' },
    });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(mockOnAuth).toHaveBeenCalledWith('correct-pass');
    });
  });

  it('shows error on wrong password', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ error: 'Unauthorized' }),
    });

    render(<PasswordGate onAuthenticated={mockOnAuth} />);

    fireEvent.change(screen.getByLabelText(/admin password/i), {
      target: { value: 'wrong' },
    });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Unauthorized');
    expect(mockOnAuth).not.toHaveBeenCalled();
  });

  it('shows error on network failure', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network'));

    render(<PasswordGate onAuthenticated={mockOnAuth} />);

    fireEvent.change(screen.getByLabelText(/admin password/i), {
      target: { value: 'anything' },
    });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    expect(
      await screen.findByText(/failed to verify password/i)
    ).toBeInTheDocument();
  });

  describe('rate limiting', () => {
    it('shows lockout countdown on 429 response', async () => {
      jest.useFakeTimers();

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: () => Promise.resolve({ retryAfter: 120 }),
      });

      render(<PasswordGate onAuthenticated={mockOnAuth} />);

      fireEvent.change(screen.getByLabelText(/admin password/i), {
        target: { value: 'wrong' },
      });

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
      });

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(
          /too many attempts.*2:00/i
        );
      });

      // Input and button should be disabled during lockout
      expect(screen.getByLabelText(/admin password/i)).toBeDisabled();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeDisabled();
    });

    it('ticks countdown down', async () => {
      jest.useFakeTimers();

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: () => Promise.resolve({ retryAfter: 3 }),
      });

      render(<PasswordGate onAuthenticated={mockOnAuth} />);

      fireEvent.change(screen.getByLabelText(/admin password/i), {
        target: { value: 'wrong' },
      });

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
      });

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(/0:03/);
      });

      act(() => {
        jest.advanceTimersByTime(2000);
      });

      expect(screen.getByRole('alert')).toHaveTextContent(/0:01/);

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      // Countdown finished — lockout message should be gone
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      expect(screen.getByLabelText(/admin password/i)).not.toBeDisabled();
    });
  });
});
