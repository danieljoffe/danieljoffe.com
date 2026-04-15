import { render, screen, waitFor } from '@testing-library/react';
import AdminDashboard from './AdminDashboard';

const originalFetch = global.fetch;

function mockFetchResponses(responses: Record<string, unknown>) {
  (global.fetch as jest.Mock).mockImplementation((url: string) => {
    for (const [pattern, data] of Object.entries(responses)) {
      if (url.includes(pattern)) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(data),
        });
      }
    }
    return Promise.resolve({
      ok: false,
      json: () => Promise.resolve({ error: 'Not found' }),
    });
  });
}

describe('AdminDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('renders stats after fetch', async () => {
    mockFetchResponses({
      '/api/audit/admin/stats': {
        totalScans: 42,
        scansToday: 5,
        totalLeads: 10,
        conversionRate: 25,
      },
      '/api/audit/admin/scans': {
        scans: [],
        total: 0,
        page: 1,
        pageSize: 20,
      },
    });

    render(<AdminDashboard />);

    expect(screen.getByText('Audit Admin')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('42')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('10')).toBeInTheDocument();
      expect(screen.getByText('25%')).toBeInTheDocument();
    });
  });

  it('shows an error message when stats fail to load', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: 'Unauthorized' }),
    });

    render(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/failed to load stats/i)).toBeInTheDocument();
    });
  });
});
