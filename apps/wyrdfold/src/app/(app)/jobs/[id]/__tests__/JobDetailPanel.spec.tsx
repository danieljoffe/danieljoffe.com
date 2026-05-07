import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import JobDetailPanel from '../../JobDetailPanel';
import type { JobPosting } from '../../types';

const mockToast = jest.fn();
jest.mock('@/state/Toast/ToastProvider', () => ({
  useToast: () => ({ toast: mockToast }),
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), prefetch: jest.fn() }),
}));

// CoverLetterSection is exercised in its own spec; stub to avoid
// secondary fetches and keep this spec focused on the panel itself.
jest.mock('../../CoverLetterSection', () => ({
  __esModule: true,
  default: () => <div data-testid='cover-letter-section-stub' />,
}));

const ORIGINAL_FETCH = global.fetch;

function makeJob(overrides: Partial<JobPosting> = {}): JobPosting {
  return {
    id: 'j-1',
    external_id: 'ext-1',
    source_id: 'src-1',
    title: 'Senior Frontend Engineer',
    company_name: 'Acme',
    location: 'Remote',
    absolute_url: null,
    score: 82,
    score_breakdown: null,
    scoring_status: 'complete',
    status: 'new',
    salary_text: null,
    greenhouse_updated_at: null,
    first_seen_at: '2026-01-01',
    created_at: '2026-01-01',
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ entries: [] }),
  }) as unknown as typeof fetch;
});

afterAll(() => {
  global.fetch = ORIGINAL_FETCH;
});

describe('JobDetailPanel', () => {
  it('renders the score badge with a labelled value', async () => {
    render(
      <JobDetailPanel
        posting={makeJob({ score: 88 })}
        targetId={undefined}
        viewFullHref={undefined}
        onDelete={undefined}
        onStatusChange={undefined}
      />
    );
    expect(await screen.findByLabelText(/match score 88/i)).toBeInTheDocument();
  });

  it('renders a score-breakdown skeleton when the posting has no breakdown', () => {
    render(
      <JobDetailPanel
        posting={makeJob({ score_breakdown: null })}
        targetId={undefined}
        viewFullHref={undefined}
        onDelete={undefined}
        onStatusChange={undefined}
      />
    );
    expect(screen.getByText(/score breakdown/i)).toBeInTheDocument();
  });

  it('renders one row per non-zero factor in the score breakdown', () => {
    render(
      <JobDetailPanel
        posting={makeJob({
          score_breakdown: {
            role_titles: 30,
            technologies: 20,
            negative: -5,
            domain_skills: 0,
          },
        })}
        targetId={undefined}
        viewFullHref={undefined}
        onDelete={undefined}
        onStatusChange={undefined}
      />
    );
    expect(screen.getByText(/role titles/i)).toBeInTheDocument();
    expect(screen.getByText(/technologies/i)).toBeInTheDocument();
    expect(screen.getByText(/penalties/i)).toBeInTheDocument();
    // Zero-valued factor must be hidden.
    expect(screen.queryByText(/domain skills/i)).not.toBeInTheDocument();
  });

  it('renders the "Open full view" link when viewFullHref is provided', () => {
    render(
      <JobDetailPanel
        posting={makeJob()}
        targetId={undefined}
        viewFullHref='/jobs/j-1'
        onDelete={undefined}
        onStatusChange={undefined}
      />
    );
    expect(
      screen.getByRole('link', { name: /open full view/i })
    ).toHaveAttribute('href', '/jobs/j-1');
  });

  it('hides the Delete button when hideDelete is set', () => {
    render(
      <JobDetailPanel
        posting={makeJob()}
        targetId={undefined}
        viewFullHref='/jobs/j-1'
        onDelete={undefined}
        onStatusChange={undefined}
        hideDelete
      />
    );
    expect(
      screen.queryByRole('button', { name: /^delete$/i })
    ).not.toBeInTheDocument();
  });

  it('renders the resume CTA when status is resume_draft', async () => {
    render(
      <JobDetailPanel
        posting={makeJob({ status: 'resume_draft' })}
        targetId={undefined}
        viewFullHref={undefined}
        onDelete={undefined}
        onStatusChange={undefined}
      />
    );
    expect(
      await screen.findByRole('link', { name: /review resume/i })
    ).toHaveAttribute('href', '/jobs/j-1/resume');
  });

  it('fetches status history on mount and renders entries when present', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        entries: [
          {
            id: 'h-1',
            old_status: 'new',
            new_status: 'saved',
            note: null,
            created_at: '2026-01-02T00:00:00Z',
          },
        ],
      }),
    }) as unknown as typeof fetch;

    render(
      <JobDetailPanel
        posting={makeJob()}
        targetId={undefined}
        viewFullHref={undefined}
        onDelete={undefined}
        onStatusChange={undefined}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/history/i)).toBeInTheDocument();
    });
  });
});
