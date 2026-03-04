import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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

  it('renders password gate initially', () => {
    render(<AdminDashboard />);
    expect(screen.getByLabelText(/admin password/i)).toBeInTheDocument();
    expect(screen.queryByText('Audit Admin')).not.toBeInTheDocument();
  });

  it('shows dashboard after authentication', async () => {
    mockFetchResponses({
      '/api/audit/admin/verify': { valid: true },
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

    fireEvent.change(screen.getByLabelText(/admin password/i), {
      target: { value: 'test-pass' },
    });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText('Audit Admin')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText('42')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('10')).toBeInTheDocument();
      expect(screen.getByText('25%')).toBeInTheDocument();
    });
  });

  it('shows sign out button that returns to password gate', async () => {
    mockFetchResponses({
      '/api/audit/admin/verify': { valid: true },
      '/api/audit/admin/stats': {
        totalScans: 0,
        scansToday: 0,
        totalLeads: 0,
        conversionRate: 0,
      },
      '/api/audit/admin/scans': {
        scans: [],
        total: 0,
        page: 1,
        pageSize: 20,
      },
    });

    render(<AdminDashboard />);

    fireEvent.change(screen.getByLabelText(/admin password/i), {
      target: { value: 'pass' },
    });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText('Sign out')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Sign out'));

    expect(screen.getByLabelText(/admin password/i)).toBeInTheDocument();
  });
});
