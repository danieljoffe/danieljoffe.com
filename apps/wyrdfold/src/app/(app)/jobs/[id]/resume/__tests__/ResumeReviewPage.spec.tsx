import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import ResumeReviewPage from '../ResumeReviewPage';

const mockToast = jest.fn();
jest.mock('@/state/Toast/ToastProvider', () => ({
  useToast: () => ({ toast: mockToast }),
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), prefetch: jest.fn() }),
}));

const POSTING = {
  id: 'j-1',
  external_id: 'ext',
  source_id: 'src',
  title: 'Senior FE',
  company_name: 'Acme',
  location: null,
  absolute_url: null,
  score: 80,
  score_breakdown: null,
  scoring_status: 'complete' as const,
  status: 'new',
  salary_text: null,
  greenhouse_updated_at: null,
  first_seen_at: '2026-04-30T00:00:00Z',
  created_at: '2026-04-30T00:00:00Z',
};

const RECORD = {
  id: 'r-1',
  user_id: 'u',
  job_posting_id: 'j-1',
  document_type: 'resume' as const,
  resume_type: 'tech_friendly',
  jd_snapshot: 'snapshot',
  jd_snapshot_hash: 'h',
  payload: {} as unknown,
  payload_md: '# Resume markdown',
  docx_payload_md_hash: null,
  storage_path: null,
  warnings: [],
  model: null,
  input_tokens: 0,
  output_tokens: 0,
  cost_usd: 0,
  latency_ms: 0,
  created_at: '2026-04-30T00:00:00Z',
  updated_at: null,
  approved_at: null,
  source_resume_id: null,
};

const originalFetch = global.fetch;

beforeEach(() => {
  mockToast.mockReset();
});

afterEach(() => {
  global.fetch = originalFetch;
});

describe('ResumeReviewPage', () => {
  it('renders a not-found state when the resume does not exist', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      status: 404,
      ok: false,
      json: async () => ({}),
    } as Response) as unknown as typeof fetch;

    render(<ResumeReviewPage jobPostingId='j-1' />);

    expect(await screen.findByText(/Resume not found/i)).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /Back to job/i })
    ).toBeInTheDocument();
  });

  it('renders the editor once both fetches succeed', async () => {
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url === '/api/jobs/j-1') {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => POSTING,
        } as Response);
      }
      if (url.includes('/tailor/by-job/')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => RECORD,
        } as Response);
      }
      return Promise.resolve({
        ok: false,
        status: 404,
        json: async () => ({}),
      } as Response);
    }) as unknown as typeof fetch;

    render(<ResumeReviewPage jobPostingId='j-1' />);

    await waitFor(() => {
      expect(screen.queryByLabelText(/Loading resume/i)).toBeNull();
    });
  });

  it('toasts an error when the network call rejects', async () => {
    global.fetch = jest
      .fn()
      .mockRejectedValue(new Error('boom')) as unknown as typeof fetch;

    render(<ResumeReviewPage jobPostingId='j-1' />);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: 'error',
          title: expect.stringMatching(/Network error/i),
        })
      );
    });
  });
});
