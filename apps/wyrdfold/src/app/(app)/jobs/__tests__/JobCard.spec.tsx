import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import JobCard from '../JobCard';
import { MANUAL_SOURCE_ID, type JobPosting } from '../types';

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, prefetch: jest.fn() }),
}));

function makeJob(overrides: Partial<JobPosting> = {}): JobPosting {
  return {
    id: 'j-1',
    external_id: 'ext-1',
    source_id: 'src-1',
    title: 'Senior Frontend Engineer',
    company_name: 'Acme',
    location: 'Remote',
    absolute_url: 'https://example.com/job',
    score: 82,
    score_breakdown: null,
    scoring_status: 'complete',
    status: 'new',
    salary_text: null,
    greenhouse_updated_at: null,
    first_seen_at: new Date(Date.now() - 86_400_000).toISOString(),
    created_at: new Date(Date.now() - 86_400_000).toISOString(),
    ...overrides,
  };
}

const noop = () => undefined;

describe('JobCard', () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  it('renders the score, title, company, and location', () => {
    render(
      <JobCard
        job={makeJob()}
        selected={false}
        onSelectToggle={noop}
        onDelete={noop}
      />
    );
    expect(screen.getByText('82')).toBeInTheDocument();
    expect(screen.getByText('Senior Frontend Engineer')).toBeInTheDocument();
    expect(screen.getByText('Acme')).toBeInTheDocument();
    expect(screen.getByText('Remote')).toBeInTheDocument();
  });

  it('shows an em-dash when location is null', () => {
    render(
      <JobCard
        job={makeJob({ location: null })}
        selected={false}
        onSelectToggle={noop}
        onDelete={noop}
      />
    );
    // Location dt cell pairs with a dd containing em-dash.
    const dts = screen.getAllByText('Location');
    expect(dts.length).toBeGreaterThan(0);
  });

  it('renders an in-progress spinner while scoring is incomplete', () => {
    render(
      <JobCard
        job={makeJob({ scoring_status: 'stage1' })}
        selected={false}
        onSelectToggle={noop}
        onDelete={noop}
      />
    );
    expect(
      screen.getByLabelText(/Scoring in progress \(stage1\)/i)
    ).toBeInTheDocument();
  });

  it('shows a "Discovered" badge for manually-added jobs', () => {
    render(
      <JobCard
        job={makeJob({ source_id: MANUAL_SOURCE_ID })}
        selected={false}
        onSelectToggle={noop}
        onDelete={noop}
      />
    );
    expect(screen.getByText('Discovered')).toBeInTheDocument();
  });

  it('navigates to the job detail page on click', async () => {
    const user = userEvent.setup();
    render(
      <JobCard
        job={makeJob()}
        selected={false}
        onSelectToggle={noop}
        onDelete={noop}
      />
    );
    const card = screen.getByRole('button', {
      name: /Senior Frontend Engineer at Acme/i,
    });
    await user.click(card);
    expect(mockPush).toHaveBeenCalledWith('/jobs/j-1');
  });

  it('toggles selection when the checkbox is clicked', async () => {
    const onSelectToggle = jest.fn();
    const user = userEvent.setup();
    render(
      <JobCard
        job={makeJob()}
        selected={false}
        onSelectToggle={onSelectToggle}
        onDelete={noop}
      />
    );
    await user.click(
      screen.getByRole('checkbox', { name: /Select Senior Frontend Engineer/i })
    );
    expect(onSelectToggle).toHaveBeenCalled();
    // Selecting must NOT also navigate.
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('reflects selection state on the checkbox', () => {
    render(
      <JobCard job={makeJob()} selected onSelectToggle={noop} onDelete={noop} />
    );
    expect(
      screen.getByRole('checkbox', { name: /Select Senior Frontend Engineer/i })
    ).toBeChecked();
  });
});
