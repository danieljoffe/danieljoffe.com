import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import JobDetail from './JobDetail';

const basePosting = {
  id: 'job-1',
  title: 'Senior Engineer',
  company_name: 'Acme',
  absolute_url: 'https://boards.greenhouse.io/acme/jobs/1',
  score: 85,
  score_breakdown: { keyword: 20, seniority: 10, location: -5 },
  status: 'new',
};

const originalFetch = global.fetch;

describe('JobDetail', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('renders score breakdown badges', () => {
    render(<JobDetail posting={basePosting} />);
    expect(screen.getByText('keyword: 20')).toBeInTheDocument();
    expect(screen.getByText('seniority: 10')).toBeInTheDocument();
    expect(screen.getByText('location: -5')).toBeInTheDocument();
  });

  it('shows fallback when breakdown is null', () => {
    render(<JobDetail posting={{ ...basePosting, score_breakdown: null }} />);
    expect(screen.getByText(/no breakdown available/i)).toBeInTheDocument();
  });

  it('renders all status buttons, disabling the current status', () => {
    render(<JobDetail posting={basePosting} />);
    expect(screen.getByRole('button', { name: 'new' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'saved' })).not.toBeDisabled();
    expect(screen.getByRole('button', { name: 'applied' })).not.toBeDisabled();
  });

  it('posts new status and updates selected state on click', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({}),
    });

    render(<JobDetail posting={basePosting} />);
    fireEvent.click(screen.getByRole('button', { name: 'saved' }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/jobs/job-1/status',
        expect.objectContaining({ method: 'POST' })
      );
      expect(screen.getByRole('button', { name: 'saved' })).toBeDisabled();
    });
  });

  it('renders an external View on Greenhouse link when absolute_url set', () => {
    render(<JobDetail posting={basePosting} />);
    const link = screen.getByRole('link', { name: /view on greenhouse/i });
    expect(link).toHaveAttribute(
      'href',
      'https://boards.greenhouse.io/acme/jobs/1'
    );
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('does not render the external link when absolute_url is null', () => {
    render(<JobDetail posting={{ ...basePosting, absolute_url: null }} />);
    expect(
      screen.queryByRole('link', { name: /view on greenhouse/i })
    ).not.toBeInTheDocument();
  });
});
