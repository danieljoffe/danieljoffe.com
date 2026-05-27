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

  it('renders the resume CTA whenever a target is selected, regardless of status', async () => {
    // ResumeSection's existence is now gated only by ``targetId`` (was
    // ``status === 'resume_draft' || 'resume_ready'``). A new user
    // opening a fresh ``new`` job needs the Generate CTA to be visible
    // without first discovering they must flip status. The status flip
    // itself happens on the backend persistence side-effect.
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (typeof url === 'string' && url.includes('/tailor/by-job/')) {
        // ResumeSection fetches the existing tailored doc; 200 with a
        // record means "Review Resume" link appears.
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ id: 'r-1', approved_at: null }),
        });
      }
      if (typeof url === 'string' && url.includes('/api/jobs/analysis/')) {
        // ``targetId`` triggers an auto-fire LLM analysis useEffect.
        // Short-circuit with a non-200 so it sets analysisError once
        // and stops re-trying — the panel still renders the resume
        // section under it, which is what we're asserting.
        return Promise.resolve({
          ok: false,
          status: 503,
          json: async () => ({ detail: 'mocked off' }),
        });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({ entries: [] }),
      });
    }) as unknown as typeof fetch;

    render(
      <JobDetailPanel
        posting={makeJob({ status: 'resume_draft' })}
        targetId='t-1'
        viewFullHref={undefined}
        onDelete={undefined}
        onStatusChange={undefined}
      />
    );
    expect(
      await screen.findByRole('link', { name: /review resume/i })
    ).toHaveAttribute('href', '/jobs/j-1/resume');
  });

  it('does NOT render resume / cover-letter sections when no target is selected', () => {
    // Tailor pipeline needs ``target_id`` — without one the section's
    // Generate button would 422. Hide the section cleanly instead.
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
      screen.queryByRole('link', { name: /review resume/i })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('cover-letter-section-stub')
    ).not.toBeInTheDocument();
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
