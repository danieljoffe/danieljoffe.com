import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ScansTable from './ScansTable';

const originalFetch = global.fetch;

const mockScans = [
  {
    id: 'scan-1',
    url: 'https://example.com',
    status: 'completed',
    grade_overall: 'A',
    created_at: '2026-02-22T12:30:00Z',
    score_performance: 95,
    score_accessibility: 90,
    score_seo: 85,
    score_best_practices: 88,
    has_lead: true,
  },
  {
    id: 'scan-2',
    url: 'https://my-really-long-subdomain.enterprise-client.co.uk/pages/about-us',
    status: 'failed',
    grade_overall: null,
    created_at: '2026-02-21T08:15:00Z',
    score_performance: null,
    score_accessibility: null,
    score_seo: null,
    score_best_practices: null,
    has_lead: false,
  },
  {
    id: 'scan-3',
    url: 'https://slow-site.org',
    status: 'completed',
    grade_overall: 'D',
    created_at: '2026-02-20T23:59:59Z',
    score_performance: 22,
    score_accessibility: 41,
    score_seo: 38,
    score_best_practices: 30,
    has_lead: true,
  },
  {
    id: 'scan-4',
    url: 'https://mid-range.dev',
    status: 'completed',
    grade_overall: 'C',
    created_at: '2026-02-19T14:00:00Z',
    score_performance: 55,
    score_accessibility: 72,
    score_seo: 60,
    score_best_practices: 65,
    has_lead: false,
  },
  {
    id: 'scan-5',
    url: 'https://pending-scan.io',
    status: 'running',
    grade_overall: null,
    created_at: '2026-02-22T13:00:00Z',
    score_performance: null,
    score_accessibility: null,
    score_seo: null,
    score_best_practices: null,
    has_lead: false,
  },
];

describe('ScansTable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('renders table with scan data across grades and statuses', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({ scans: mockScans, total: 5, page: 1, pageSize: 20 }),
    });

    render(<ScansTable password='test' />);

    await waitFor(() => {
      expect(screen.getByText('https://example.com')).toBeInTheDocument();
    });

    // Grade A (success), D (error), C (warning), and null grades shown as dash
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('D')).toBeInTheDocument();
    expect(screen.getByText('C')).toBeInTheDocument();
    expect(screen.getAllByText('-')).toHaveLength(2); // failed + running have no grade

    // All three status variants rendered
    expect(screen.getAllByText('completed')).toHaveLength(3);
    expect(screen.getByText('failed')).toBeInTheDocument();
    expect(screen.getByText('running')).toBeInTheDocument();

    // Lead indicators
    expect(screen.getAllByText('Yes')).toHaveLength(2);
    expect(screen.getAllByText('No')).toHaveLength(3);

    // Long URL is present (truncated visually by CSS, but text is in DOM)
    expect(
      screen.getByText(
        'https://my-really-long-subdomain.enterprise-client.co.uk/pages/about-us'
      )
    ).toBeInTheDocument();
  });

  it('shows empty state when no scans', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          scans: [] as unknown[],
          total: 0,
          page: 1,
          pageSize: 20,
        }),
    });

    render(<ScansTable password='test' />);

    await waitFor(() => {
      expect(screen.getByText('No scans yet')).toBeInTheDocument();
    });
  });

  it('shows pagination when multiple pages', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          scans: mockScans,
          total: 50,
          page: 1,
          pageSize: 20,
        }),
    });

    render(<ScansTable password='test' />);

    await waitFor(() => {
      expect(screen.getByText('Page 1 of 3')).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /previous/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /next/i })).not.toBeDisabled();
  });

  it('opens report in new tab on row click', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          scans: mockScans,
          total: 2,
          page: 1,
          pageSize: 20,
        }),
    });

    const mockOpen = jest.fn();
    window.open = mockOpen;

    render(<ScansTable password='test' />);

    await waitFor(() => {
      expect(screen.getByText('https://example.com')).toBeInTheDocument();
    });

    const row = screen.getByText('https://example.com').closest('tr');
    expect(row).toBeInTheDocument();
    fireEvent.click(row as HTMLElement);
    expect(mockOpen).toHaveBeenCalledWith('/audit/r/scan-1', '_blank');
  });
});
