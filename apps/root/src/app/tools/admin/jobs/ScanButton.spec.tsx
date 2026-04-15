import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ScanButton from './ScanButton';

const mockToast = jest.fn();

jest.mock('@/state/Toast/ToastProvider', () => ({
  useToast: () => ({ toast: mockToast }),
}));

const originalFetch = global.fetch;

describe('ScanButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('renders the scan button', () => {
    render(<ScanButton onComplete={jest.fn()} />);
    expect(
      screen.getByRole('button', { name: /scan now/i })
    ).toBeInTheDocument();
  });

  it('calls onComplete and renders result summary on successful scan', async () => {
    const onComplete = jest.fn();
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          sources_polled: 5,
          new_jobs: 3,
          updated_jobs: 7,
          errors: [] as string[],
        }),
    });

    render(<ScanButton onComplete={onComplete} />);
    fireEvent.click(screen.getByRole('button', { name: /scan now/i }));

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalled();
      expect(
        screen.getByText(/5 sources, 3 new, 7 updated/i)
      ).toBeInTheDocument();
    });
  });

  it('shows a warning toast when scan completes with errors', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          sources_polled: 5,
          new_jobs: 0,
          updated_jobs: 0,
          errors: ['source-1 failed'],
        }),
    });

    render(<ScanButton onComplete={jest.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /scan now/i }));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ variant: 'warning' })
      );
    });
  });

  it('shows an error toast when scan request fails', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: 'boom' }),
    });

    render(<ScanButton onComplete={jest.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /scan now/i }));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: 'error',
          title: 'Scan failed',
        })
      );
    });
  });

  it('shows an error toast on network failure', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('offline'));

    render(<ScanButton onComplete={jest.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /scan now/i }));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: 'error',
          description: 'offline',
        })
      );
    });
  });
});
