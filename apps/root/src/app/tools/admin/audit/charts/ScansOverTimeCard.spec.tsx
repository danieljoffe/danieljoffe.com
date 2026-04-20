import { render, screen, waitFor } from '@testing-library/react';
import ScansOverTimeCard from './ScansOverTimeCard';

const originalFetch = global.fetch;

describe('ScansOverTimeCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('renders the empty state when the series has no scans', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          interval: 'weekly',
          period: '3m',
          series: [
            {
              bucketStart: '2026-03-01T00:00:00Z',
              avgOverall: null,
              scanCount: 0,
            },
          ],
        }),
    });

    render(<ScansOverTimeCard />);

    expect(screen.getByText('Scans Over Time')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/not enough data yet/i)).toBeInTheDocument();
    });
  });

  it('shows an error when the fetch fails', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: 'Boom' }),
    });

    render(<ScansOverTimeCard />);

    await waitFor(() => {
      expect(
        screen.getByText(/failed to load trend data/i)
      ).toBeInTheDocument();
    });
  });

  it('hides empty and error copy once scans are loaded', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          interval: 'weekly',
          period: '3m',
          series: [
            {
              bucketStart: '2026-03-01T00:00:00Z',
              avgOverall: 72,
              scanCount: 12,
            },
            {
              bucketStart: '2026-03-08T00:00:00Z',
              avgOverall: 68,
              scanCount: 9,
            },
          ],
        }),
    });

    render(<ScansOverTimeCard />);

    await waitFor(() => {
      expect(
        screen.queryByText(/not enough data yet/i)
      ).not.toBeInTheDocument();
    });
    expect(
      screen.queryByText(/failed to load trend data/i)
    ).not.toBeInTheDocument();
  });
});
