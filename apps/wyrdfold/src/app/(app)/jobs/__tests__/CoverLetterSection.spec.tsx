import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CoverLetterSection from '../CoverLetterSection';
import type { TailoredResumeRecord } from '../types';

const mockToast = jest.fn();
jest.mock('@/state/Toast/ToastProvider', () => ({
  useToast: () => ({ toast: mockToast }),
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), prefetch: jest.fn() }),
}));

const ORIGINAL_FETCH = global.fetch;

function makeRecord(
  overrides: Partial<TailoredResumeRecord> = {}
): TailoredResumeRecord {
  return {
    id: 'cl-1',
    user_id: 'u-1',
    job_posting_id: 'j-1',
    document_type: 'cover_letter',
    resume_type: 'standard',
    jd_snapshot: '...',
    jd_snapshot_hash: 'hash',
    payload: {
      contact: {
        name: 'Daniel',
        email: null,
        phone: null,
        location: null,
        website: null,
        linkedin: null,
      },
      recipient_company: 'Acme',
      recipient_role: null,
      salutation: 'Hi',
      paragraphs: [],
      closing: 'Best',
      signature: 'Daniel',
      jd_snippet: '...',
      preferences_applied: [],
      source_outcome_refs: [],
      source_role_refs: [],
      source_skill_refs: [],
    },
    payload_md: null,
    docx_payload_md_hash: null,
    storage_path: null,
    warnings: [],
    model: null,
    input_tokens: 0,
    output_tokens: 0,
    cost_usd: 0,
    latency_ms: 0,
    created_at: '2026-01-01',
    updated_at: null,
    approved_at: null,
    source_resume_id: null,
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

afterAll(() => {
  global.fetch = ORIGINAL_FETCH;
});

describe('CoverLetterSection', () => {
  it('renders the empty/not-started state with a Generate CTA when no record exists', async () => {
    // ``/api/jobs/tailor/by-job/{id}/cover-letter`` now returns 200
    // with a ``null`` body when no record exists (was 404). The
    // section treats both null and the old 404 the same way —
    // render the Generate CTA — see the route docstring for the
    // browser-console-noise rationale.
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => null,
    }) as unknown as typeof fetch;

    render(
      <CoverLetterSection
        jobPostingId='j-1'
        companyName='Acme'
        roleTitle='SWE'
      />
    );

    expect(
      await screen.findByRole('button', { name: /generate cover letter/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/not started/i)).toBeInTheDocument();
  });

  it('renders a Review link for an unapproved cover letter', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => makeRecord(),
    }) as unknown as typeof fetch;

    render(
      <CoverLetterSection
        jobPostingId='j-1'
        companyName='Acme'
        roleTitle='SWE'
      />
    );

    const reviewLink = await screen.findByRole('link', {
      name: /review cover letter/i,
    });
    expect(reviewLink).toHaveAttribute('href', '/jobs/j-1/cover-letter');
    expect(screen.getByText(/^generated$/i)).toBeInTheDocument();
  });

  it('renders a View / Download link when the cover letter is approved', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => makeRecord({ approved_at: '2026-01-02' }),
    }) as unknown as typeof fetch;

    render(
      <CoverLetterSection
        jobPostingId='j-1'
        companyName='Acme'
        roleTitle='SWE'
      />
    );

    expect(
      await screen.findByRole('link', { name: /view \/ download/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/^approved$/i)).toBeInTheDocument();
  });

  it('toasts an error when the generation request fails (non-2xx)', async () => {
    const calls: string[] = [];
    global.fetch = jest.fn().mockImplementation((url: string) => {
      calls.push(url);
      // Initial fetch — 200 with null body (no existing record).
      // Switched from 404 in the by-job route to avoid the
      // browser auto-logging a console error on every job-detail
      // visit before generation.
      if (calls.length === 1) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => null,
        });
      }
      // Generate POST — 500
      return Promise.resolve({
        ok: false,
        status: 500,
        json: async () => ({}),
      });
    }) as unknown as typeof fetch;

    const user = userEvent.setup();
    render(
      <CoverLetterSection
        jobPostingId='j-1'
        companyName='Acme'
        roleTitle='SWE'
      />
    );

    await user.click(
      await screen.findByRole('button', { name: /generate cover letter/i })
    );

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ variant: 'error' })
      );
    });
  });
});
