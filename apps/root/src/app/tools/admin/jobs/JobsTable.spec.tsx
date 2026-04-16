import { render, screen, fireEvent } from '@testing-library/react';
import JobsTable from './JobsTable';
import type { JobPosting, JobsFilterState } from './types';

const mockUseAdminTableFetch = jest.fn();

jest.mock('@/hooks/useAdminTableFetch', () => ({
  useAdminTableFetch: (...args: unknown[]) => mockUseAdminTableFetch(...args),
}));

const filters: JobsFilterState = {
  minScore: '30',
  status: '',
  company: '',
  search: '',
};

const mockJobs: JobPosting[] = [
  {
    id: 'job-1',
    greenhouse_id: 1001,
    title: 'Senior Frontend Engineer',
    company_name: 'Acme',
    location: 'Remote',
    absolute_url: 'https://boards.greenhouse.io/acme/jobs/1',
    score: 82,
    score_breakdown: { keyword: 10 },
    status: 'new',
    first_seen_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  },
  {
    id: 'job-2',
    greenhouse_id: 1002,
    title: 'Staff Engineer',
    company_name: 'Beta',
    location: null,
    absolute_url: null,
    score: 45,
    score_breakdown: null,
    status: 'applied',
    first_seen_at: new Date(Date.now() - 86400000).toISOString(),
    created_at: new Date(Date.now() - 86400000).toISOString(),
  },
];

function setTableState(overrides: Partial<Record<string, unknown>> = {}) {
  mockUseAdminTableFetch.mockReturnValue({
    data: mockJobs,
    loading: false,
    page: 1,
    setPage: jest.fn(),
    totalPages: 1,
    sort: 'score',
    order: 'desc',
    handleSort: jest.fn(),
    sortIndicator: () => '',
    refetch: jest.fn(),
    ...overrides,
  });
}

describe('JobsTable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows spinner while loading with empty data', () => {
    setTableState({ data: [], loading: true });
    render(<JobsTable filters={filters} refreshKey={0} />);
    expect(screen.getByLabelText(/loading jobs/i)).toBeInTheDocument();
  });

  it('shows empty state when no jobs', () => {
    setTableState({ data: [], loading: false });
    render(<JobsTable filters={filters} refreshKey={0} />);
    expect(
      screen.getByText(/no jobs found\. try adjusting filters/i)
    ).toBeInTheDocument();
  });

  it('renders job rows with title, company, score and status', () => {
    setTableState();
    render(<JobsTable filters={filters} refreshKey={0} />);

    expect(screen.getByText('Senior Frontend Engineer')).toBeInTheDocument();
    expect(screen.getByText('Acme')).toBeInTheDocument();
    expect(screen.getByText('82')).toBeInTheDocument();
    expect(screen.getByText('Staff Engineer')).toBeInTheDocument();
    expect(screen.getByText('applied')).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('renders title as external link when absolute_url is present', () => {
    setTableState();
    render(<JobsTable filters={filters} refreshKey={0} />);
    const link = screen.getByRole('link', {
      name: /senior frontend engineer/i,
    });
    expect(link).toHaveAttribute(
      'href',
      'https://boards.greenhouse.io/acme/jobs/1'
    );
  });

  it('expands a row to show JobDetail when clicked', () => {
    setTableState();
    render(<JobsTable filters={filters} refreshKey={0} />);

    const row = screen.getByText('Senior Frontend Engineer').closest('tr');
    expect(row).toBeInTheDocument();
    fireEvent.click(row as HTMLElement);

    expect(screen.getByText(/score breakdown/i)).toBeInTheDocument();
  });

  it('renders pagination when totalPages > 1', () => {
    setTableState({ totalPages: 3 });
    render(<JobsTable filters={filters} refreshKey={0} />);
    expect(screen.getByRole('navigation')).toBeInTheDocument();
  });
});
