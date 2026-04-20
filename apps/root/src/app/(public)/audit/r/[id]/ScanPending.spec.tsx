import { render, screen, waitFor, act } from '@testing-library/react';
import ScanPending from './ScanPending';

const mockRefresh = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    refresh: () => mockRefresh(),
    prefetch: jest.fn(),
    back: jest.fn(),
  }),
}));

const originalFetch = global.fetch;

describe('ScanPending', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('renders the progress UI while polling returns pending status', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: 'pending' }),
    });

    await act(async () => {
      render(
        <ScanPending
          scanId='scan-1'
          url='https://example.com'
          deviceMode='mobile'
          isPaired={false}
        />
      );
    });

    expect(global.fetch).toHaveBeenCalledWith('/api/audit/status/scan-1');
    // ScanProgress renders — just assert the scanned URL is visible somewhere
    await waitFor(() => {
      expect(screen.queryByText(/scan failed/i)).not.toBeInTheDocument();
    });
  });

  it('refreshes the router when status becomes completed', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: 'completed' }),
    });

    await act(async () => {
      render(
        <ScanPending
          scanId='scan-1'
          url='https://example.com'
          deviceMode='mobile'
          isPaired={false}
        />
      );
    });

    await waitFor(() => {
      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  it('shows the failed state when status becomes failed', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: 'failed', error_message: 'nope' }),
    });

    await act(async () => {
      render(
        <ScanPending
          scanId='scan-1'
          url='https://example.com'
          deviceMode='mobile'
          isPaired={false}
        />
      );
    });

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /scan failed/i })
      ).toBeInTheDocument();
    });
    expect(screen.getByRole('link', { name: /try again/i })).toHaveAttribute(
      'href',
      '/audit'
    );
  });

  it('shows a timeout error after the max poll attempts', async () => {
    jest.useFakeTimers();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: 'pending' }),
    });

    await act(async () => {
      render(
        <ScanPending
          scanId='scan-1'
          url='https://example.com'
          deviceMode='mobile'
          isPaired={false}
        />
      );
    });

    // Advance through 90 polling intervals (3 minutes at 2s each).
    for (let i = 0; i < 90; i += 1) {
      await act(async () => {
        jest.advanceTimersByTime(2000);
      });
    }

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /scan failed/i })
      ).toBeInTheDocument();
    });
    expect(
      screen.getByText(/taking longer than expected/i)
    ).toBeInTheDocument();
    jest.useRealTimers();
  });

  it('shows a failed state when the poll request errors', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({}),
    });

    await act(async () => {
      render(
        <ScanPending
          scanId='scan-1'
          url='https://example.com'
          deviceMode='mobile'
          isPaired={false}
        />
      );
    });

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /scan failed/i })
      ).toBeInTheDocument();
    });
  });
});
