import { render, screen, waitFor } from '@testing-library/react';
import ScoreDistributionCard from './ScoreDistributionCard';

const originalFetch = global.fetch;

describe('ScoreDistributionCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('renders the empty state when no scans have completed', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          period: null,
          averages: {
            performance: null,
            accessibility: null,
            bestPractices: null,
            seo: null,
            overall: null,
          },
          gradeDistribution: { A: 0, B: 0, C: 0, D: 0, F: 0 },
          total: 0,
        }),
    });

    render(<ScoreDistributionCard />);

    expect(screen.getByText('Score Distribution')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/not enough data yet/i)).toBeInTheDocument();
    });
  });

  it('shows an error when the fetch fails', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: 'Boom' }),
    });

    render(<ScoreDistributionCard />);

    await waitFor(() => {
      expect(
        screen.getByText(/failed to load score data/i)
      ).toBeInTheDocument();
    });
  });

  it('hides empty copy once grade data loads', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          period: null,
          averages: {
            performance: 72,
            accessibility: 84,
            bestPractices: 79,
            seo: 88,
            overall: 81,
          },
          gradeDistribution: { A: 4, B: 6, C: 3, D: 1, F: 0 },
          total: 14,
        }),
    });

    render(<ScoreDistributionCard />);

    await waitFor(() => {
      expect(
        screen.queryByText(/not enough data yet/i)
      ).not.toBeInTheDocument();
    });
    expect(
      screen.queryByText(/failed to load score data/i)
    ).not.toBeInTheDocument();
  });
});
