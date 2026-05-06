import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import DashboardPage from '../DashboardPage';
import type { JobPosting } from '../jobs/types';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), prefetch: jest.fn() }),
}));

function makeJob(overrides: Partial<JobPosting> = {}): JobPosting {
  return {
    id: 'j-1',
    external_id: 'ext',
    source_id: 'src',
    title: 'Senior Engineer',
    company_name: 'Acme',
    location: 'Remote',
    absolute_url: null,
    score: 88,
    score_breakdown: null,
    scoring_status: 'complete',
    status: 'new',
    salary_text: null,
    greenhouse_updated_at: null,
    first_seen_at: '2026-04-30T00:00:00Z',
    created_at: '2026-04-30T00:00:00Z',
    ...overrides,
  };
}

describe('DashboardPage', () => {
  it('shows the build-profile zero state when hasProfile is false', () => {
    render(
      <DashboardPage
        initial={{
          topMatches: [],
          counts: {},
          hasProfile: false,
          hasActiveTargets: false,
        }}
      />
    );
    expect(screen.getByText(/Build your profile/i)).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /Set up profile/i })
    ).toBeInTheDocument();
  });

  it('shows the activate-target zero state when profile exists but no active targets', () => {
    render(
      <DashboardPage
        initial={{
          topMatches: [],
          counts: {},
          hasProfile: true,
          hasActiveTargets: false,
        }}
      />
    );
    expect(
      screen.getByRole('link', { name: /Manage targets/i })
    ).toBeInTheDocument();
  });

  it('renders the four pipeline stats with their counts when populated', () => {
    render(
      <DashboardPage
        initial={{
          topMatches: [],
          counts: { new: 7, saved: 3, resume_draft: 1, applied: 2 },
          hasProfile: true,
          hasActiveTargets: true,
        }}
      />
    );
    expect(
      screen.getByRole('link', { name: /New matches 7/i })
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Saved 3/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Drafts 1/i })).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /Applied 2/i })
    ).toBeInTheDocument();
  });

  it('shows the empty state for top matches when none exist', () => {
    render(
      <DashboardPage
        initial={{
          topMatches: [],
          counts: { new: 0, saved: 0, resume_draft: 0, applied: 0 },
          hasProfile: true,
          hasActiveTargets: true,
        }}
      />
    );
    expect(screen.getByText(/No new matches right now/i)).toBeInTheDocument();
  });

  it('renders one card per top match with the score badge', () => {
    render(
      <DashboardPage
        initial={{
          topMatches: [
            makeJob({ id: 'a', title: 'Engineer A' }),
            makeJob({ id: 'b', title: 'Engineer B', score: 65 }),
          ],
          counts: { new: 0, saved: 0, resume_draft: 0, applied: 0 },
          hasProfile: true,
          hasActiveTargets: true,
        }}
      />
    );
    expect(screen.getByText('Engineer A')).toBeInTheDocument();
    expect(screen.getByText('Engineer B')).toBeInTheDocument();
    // Both score badges visible:
    expect(screen.getByText('88')).toBeInTheDocument();
    expect(screen.getByText('65')).toBeInTheDocument();
  });
});
