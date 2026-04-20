import { render, screen, waitFor } from '@testing-library/react';
import LeadSourcesCard from './LeadSourcesCard';

const originalFetch = global.fetch;

describe('LeadSourcesCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('renders the empty state when no leads have been captured', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ total: 0, sources: [] }),
    });

    render(<LeadSourcesCard />);

    expect(screen.getByText('Lead Sources')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/no leads captured yet/i)).toBeInTheDocument();
    });
  });

  it('shows an error when the fetch fails', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: 'Unauthorized' }),
    });

    render(<LeadSourcesCard />);

    await waitFor(() => {
      expect(
        screen.getByText(/failed to load lead sources/i)
      ).toBeInTheDocument();
    });
  });

  it('hides empty and error copy once sources load', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          total: 5,
          sources: [
            { source: 'organic', count: 3 },
            { source: 'full_report', count: 2 },
          ],
        }),
    });

    render(<LeadSourcesCard />);

    await waitFor(() => {
      expect(
        screen.queryByText(/no leads captured yet/i)
      ).not.toBeInTheDocument();
    });
    expect(
      screen.queryByText(/failed to load lead sources/i)
    ).not.toBeInTheDocument();
  });
});
