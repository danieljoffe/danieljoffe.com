import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import JobDetailPage from '../JobDetailPage';
import type { JobPosting } from '../../types';

const mockPush = jest.fn();
const mockToast = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: (...args: unknown[]) => mockPush(...args),
    replace: jest.fn(),
    refresh: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
  }),
}));

jest.mock('@/state/Toast/ToastProvider', () => ({
  useToast: () => ({
    toast: (...args: unknown[]) => mockToast(...args),
  }),
}));

// JobDetailPanel is a heavy client component with its own fetches and state.
// We stub it to a sentinel that surfaces the posting + targetId props the
// page hands down, and renders mock CTAs (Resume / Cover letter / Save /
// Apply) plus a score-breakdown summary so the page-level smoke + breakdown
// assertions can target stable roles.
type JobDetailPanelStubProps = {
  posting: JobPosting;
  targetId: string | undefined;
  hideDelete?: boolean;
};

let _lastPanelProps: JobDetailPanelStubProps | null = null;

jest.mock('../../JobDetailPanel', () => ({
  __esModule: true,
  default: (props: JobDetailPanelStubProps) => {
    _lastPanelProps = props;
    const breakdown = props.posting.score_breakdown ?? {};
    return (
      <div data-testid='job-detail-panel-stub'>
        <span data-testid='panel-posting-id'>{props.posting.id}</span>
        <span data-testid='panel-target-id'>{props.targetId ?? 'none'}</span>
        <button type='button' name='resume-cta'>
          Resume
        </button>
        <button type='button' name='cover-letter-cta'>
          Cover letter
        </button>
        <button type='button' name='save-cta'>
          Save
        </button>
        <button type='button' name='apply-cta'>
          Apply
        </button>
        <section aria-label='Score breakdown'>
          {Object.entries(breakdown).map(([k, v]) => (
            <div key={k} data-testid={`factor-${k}`}>
              {k}: {v}
            </div>
          ))}
        </section>
      </div>
    );
  },
}));

const POSTING: JobPosting = {
  id: 'job-42',
  external_id: 'ext-42',
  source_id: 'src-1',
  title: 'Senior Frontend Engineer',
  company_name: 'Acme Corp',
  location: 'Remote',
  absolute_url: 'https://example.com/job-42',
  score: 87,
  score_breakdown: {
    role_titles: 12,
    technologies: 8,
    domain_skills: 5,
  },
  scoring_status: 'complete',
  status: 'new',
  salary_text: '$180k–$220k',
  greenhouse_updated_at: null,
  first_seen_at: '2026-01-01T00:00:00Z',
  created_at: '2026-01-01T00:00:00Z',
};

const ORIGINAL_FETCH = global.fetch;
const ORIGINAL_CONFIRM = window.confirm;

afterAll(() => {
  global.fetch = ORIGINAL_FETCH;
  window.confirm = ORIGINAL_CONFIRM;
});

beforeEach(() => {
  jest.clearAllMocks();
  _lastPanelProps = null;
  // Default fetch — used by JobDetailPage's posting load + targets fallback.
  // Tests override per-call as needed via mockImplementationOnce.
  global.fetch = jest.fn().mockImplementation((url: string) => {
    if (url.startsWith('/api/jobs/')) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => POSTING,
      });
    }
    if (url === '/api/targets/mine') {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({ targets: [] }),
      });
    }
    return Promise.resolve({
      ok: true,
      status: 200,
      json: async () => ({}),
    });
  }) as unknown as typeof fetch;
});

describe('JobDetailPage — loading state', () => {
  it('renders the loading skeleton before fetch resolves', () => {
    // Pin fetch to a never-resolving promise so we stay in loading state.
    global.fetch = jest.fn(
      () => new Promise(() => undefined)
    ) as unknown as typeof fetch;

    render(<JobDetailPage id='job-42' targetId={undefined} />);

    expect(screen.getByLabelText(/loading job/i)).toBeInTheDocument();
  });
});

describe('JobDetailPage — happy path', () => {
  it('fetches the posting and renders the title heading', async () => {
    render(<JobDetailPage id='job-42' targetId='target-xyz' />);

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: /senior frontend engineer/i,
      })
    ).toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledWith('/api/jobs/job-42');
  });

  it('renders the company, location, and salary metadata', async () => {
    render(<JobDetailPage id='job-42' targetId='target-xyz' />);

    expect(await screen.findByText('Acme Corp')).toBeInTheDocument();
    expect(screen.getByText('Remote')).toBeInTheDocument();
    expect(screen.getByText('$180k–$220k')).toBeInTheDocument();
  });

  it('renders a "Back to jobs" link and an external posting link', async () => {
    render(<JobDetailPage id='job-42' targetId='target-xyz' />);

    await screen.findByRole('heading', { name: /senior frontend engineer/i });
    expect(screen.getByRole('link', { name: /back to jobs/i })).toHaveAttribute(
      'href',
      '/jobs'
    );
    const external = screen.getByRole('link', {
      name: /view original posting/i,
    });
    expect(external).toHaveAttribute('href', 'https://example.com/job-42');
    expect(external).toHaveAttribute('target', '_blank');
    expect(external).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('forwards the posting to JobDetailPanel and renders key CTAs', async () => {
    render(<JobDetailPage id='job-42' targetId='target-xyz' />);

    await screen.findByTestId('job-detail-panel-stub');
    expect(screen.getByTestId('panel-posting-id')).toHaveTextContent('job-42');
    expect(screen.getByTestId('panel-target-id')).toHaveTextContent(
      'target-xyz'
    );
    expect(screen.getByRole('button', { name: 'Resume' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Cover letter' })
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Apply' })).toBeInTheDocument();
  });

  it('exposes the score breakdown factors via the panel', async () => {
    render(<JobDetailPage id='job-42' targetId='target-xyz' />);

    await screen.findByTestId('job-detail-panel-stub');
    const breakdown = screen.getByRole('region', { name: /score breakdown/i });
    expect(breakdown).toBeInTheDocument();
    expect(screen.getByTestId('factor-role_titles')).toHaveTextContent(
      'role_titles: 12'
    );
    expect(screen.getByTestId('factor-technologies')).toHaveTextContent(
      'technologies: 8'
    );
    expect(screen.getByTestId('factor-domain_skills')).toHaveTextContent(
      'domain_skills: 5'
    );
  });

  it('renders a Delete posting button at the page root', async () => {
    render(<JobDetailPage id='job-42' targetId='target-xyz' />);

    expect(
      await screen.findByRole('button', { name: /delete posting/i })
    ).toBeInTheDocument();
  });

  it('falls back to the first active target when no targetId is passed', async () => {
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url === '/api/jobs/job-42') {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => POSTING,
        });
      }
      if (url === '/api/targets/mine') {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            targets: [
              {
                user_target: { is_active: true },
                target: { id: 'fallback-tgt' },
              },
            ],
          }),
        });
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => ({}) });
    }) as unknown as typeof fetch;

    render(<JobDetailPage id='job-42' targetId={undefined} />);

    await screen.findByTestId('job-detail-panel-stub');
    await waitFor(() => {
      expect(screen.getByTestId('panel-target-id')).toHaveTextContent(
        'fallback-tgt'
      );
    });
  });
});

describe('JobDetailPage — not found', () => {
  it('renders a "Job not found" message when the API returns 404', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ error: 'not found' }),
    }) as unknown as typeof fetch;

    render(<JobDetailPage id='missing' targetId={undefined} />);

    expect(
      await screen.findByRole('heading', { level: 1, name: /job not found/i })
    ).toBeInTheDocument();
  });
});

describe('JobDetailPage — delete', () => {
  it('confirms, calls DELETE, toasts success, and routes back to /jobs', async () => {
    window.confirm = jest.fn(() => true);
    const fetchMock = jest
      .fn()
      .mockImplementation((url: string, init?: RequestInit) => {
        if (init?.method === 'DELETE') {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({}),
          });
        }
        if (url === '/api/jobs/job-42') {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => POSTING,
          });
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({}),
        });
      });
    global.fetch = fetchMock as unknown as typeof fetch;

    const user = userEvent.setup();
    render(<JobDetailPage id='job-42' targetId='target-xyz' />);

    await user.click(
      await screen.findByRole('button', { name: /delete posting/i })
    );

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/jobs/job-42',
        expect.objectContaining({ method: 'DELETE' })
      );
    });
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ variant: 'success' })
    );
    expect(mockPush).toHaveBeenCalledWith('/jobs');
  });
});
