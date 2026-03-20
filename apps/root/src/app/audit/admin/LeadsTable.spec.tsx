import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LeadsTable from './LeadsTable';

const originalFetch = global.fetch;

const mockLeads = [
  {
    id: 'lead-1',
    email: 'cto@enterprise-corp.com',
    name: 'Sarah Chen',
    company: 'Enterprise Corp',
    url_scanned: 'https://enterprise-corp.com',
    source: 'full_report',
    created_at: '2026-02-22T09:30:00Z',
    email_sequence_step: 1,
  },
  {
    id: 'lead-2',
    email: 'jane@test.com',
    name: null,
    company: null,
    url_scanned: null,
    source: 'full_report',
    created_at: '2026-02-21T15:45:00Z',
    email_sequence_step: 2,
  },
  {
    id: 'lead-3',
    email:
      'very.long.email.address+marketing-campaign@subdomain.my-really-long-company-name.co.uk',
    name: 'A',
    company: 'International Consolidated Holdings Group & Associates Ltd.',
    url_scanned:
      'https://my-really-long-subdomain.enterprise-client.co.uk/pages/about-us',
    source: 'lead_gate',
    created_at: '2026-02-20T00:01:00Z',
    email_sequence_step: 0,
  },
  {
    id: 'lead-4',
    email: 'repeat-visitor@example.org',
    name: 'Bob',
    company: null,
    url_scanned: 'https://example.org',
    source: 'full_report',
    created_at: '2026-02-19T23:59:59Z',
    email_sequence_step: 5,
  },
  {
    id: 'lead-5',
    email: 'freelancer@gmail.com',
    name: 'Mo',
    company: '',
    url_scanned: 'https://my-portfolio.dev',
    source: 'lead_gate',
    created_at: '2026-01-15T06:00:00Z',
    email_sequence_step: 3,
  },
];

describe('LeadsTable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('renders table with lead data across sources and sequence steps', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({ leads: mockLeads, total: 5, page: 1, pageSize: 20 }),
    });

    render(<LeadsTable password='test' />);

    await waitFor(() => {
      expect(screen.getByText('cto@enterprise-corp.com')).toBeInTheDocument();
    });

    // Names rendered (including very short ones)
    expect(screen.getByText('Sarah Chen')).toBeInTheDocument();
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('Mo')).toBeInTheDocument();

    // Both source types present
    expect(screen.getAllByText('full_report')).toHaveLength(3);
    expect(screen.getAllByText('lead_gate')).toHaveLength(2);

    // Long email rendered
    expect(
      screen.getByText(
        'very.long.email.address+marketing-campaign@subdomain.my-really-long-company-name.co.uk'
      )
    ).toBeInTheDocument();

    // High email sequence step (repeat visitor outlier)
    expect(screen.getByText('5')).toBeInTheDocument();
    // Step 0 (fresh lead outlier)
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('shows empty state when no leads', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          leads: [] as unknown[],
          total: 0,
          page: 1,
          pageSize: 20,
        }),
    });

    render(<LeadsTable password='test' />);

    await waitFor(() => {
      expect(screen.getByText('No leads yet')).toBeInTheDocument();
    });
  });

  it('copies email to clipboard on click', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          leads: [mockLeads[0]],
          total: 1,
          page: 1,
          pageSize: 20,
        }),
    });

    const mockWriteText = jest.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: { writeText: mockWriteText },
    });

    render(<LeadsTable password='test' />);

    await waitFor(() => {
      expect(screen.getByText('cto@enterprise-corp.com')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('cto@enterprise-corp.com'));

    await waitFor(() => {
      expect(mockWriteText).toHaveBeenCalledWith('cto@enterprise-corp.com');
      expect(screen.getByText('Copied!')).toBeInTheDocument();
    });
  });

  it('shows dashes for null fields', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          leads: [mockLeads[1]],
          total: 1,
          page: 1,
          pageSize: 20,
        }),
    });

    render(<LeadsTable password='test' />);

    await waitFor(() => {
      expect(screen.getByText('jane@test.com')).toBeInTheDocument();
    });

    // Null name, company, url_scanned should show dashes
    const dashes = screen.getAllByText('-');
    expect(dashes.length).toBeGreaterThanOrEqual(3);
  });
});
