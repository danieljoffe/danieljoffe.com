import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import JobsList, { type TargetTab } from '../JobsList';
import type { JobPosting, JobsFilterState } from '../types';

const mockReplace = jest.fn();
const mockToast = jest.fn();

// Live URL-state mock that triggers re-renders on write — push/replace
// re-parse the query string, bump a tick counter, and notify the
// subscribed components. Real Next.js does this via the App Router's
// navigation context; the mock has to recreate enough of that contract
// for ``useSearchParams`` to fire updates.
type Listener = () => void;
const navState: { params: URLSearchParams; listeners: Set<Listener> } = {
  params: new URLSearchParams(),
  listeners: new Set(),
};
const writeUrl = (url: unknown) => {
  if (typeof url !== 'string') return;
  const qs = url.includes('?') ? url.split('?', 2)[1] : '';
  navState.params = new URLSearchParams(qs);
  navState.listeners.forEach(l => l());
};

jest.mock('next/navigation', () => {
  const { useEffect, useState } =
    jest.requireActual<typeof import('react')>('react');
  return {
    useRouter: () => ({
      push: (...args: unknown[]) => {
        writeUrl(args[0]);
        mockReplace(...args);
      },
      replace: (...args: unknown[]) => {
        writeUrl(args[0]);
        mockReplace(...args);
      },
      refresh: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
    }),
    useSearchParams: () => {
      const [, setTick] = useState(0);
      useEffect(() => {
        const listener = () => setTick(t => t + 1);
        navState.listeners.add(listener);
        return () => {
          navState.listeners.delete(listener);
        };
      }, []);
      return navState.params;
    },
    usePathname: () => '/jobs',
  };
});

jest.mock('@/state/Toast/ToastProvider', () => ({
  useToast: () => ({
    toast: (...args: unknown[]) => mockToast(...args),
  }),
}));

// Capture the most recent JobsListView props so each test can inspect /
// invoke the callbacks the parent passed in. We render minimal UI from the
// stub: a filter button (to verify onFiltersChange fires), a select-toggle
// button (onSelectionChange), and a posting row per item.
type JobsListViewSpyProps = {
  filters: JobsFilterState;
  onFiltersChange: (f: JobsFilterState) => void;
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  refreshKey: number;
  targetId: string | undefined;
  analysisTargetId: string | undefined;
  onPostingsLoaded?: ((postings: JobPosting[]) => void) | undefined;
};

let lastJobsListViewProps: JobsListViewSpyProps | null = null;
let mockPostings: JobPosting[] = [];
let mockLoading = false;

jest.mock('../JobsListView', () => ({
  __esModule: true,
  default: (props: JobsListViewSpyProps) => {
    lastJobsListViewProps = props;
    if (mockLoading) {
      return (
        <div data-testid='jobs-list-view-stub' aria-label='Loading jobs'>
          loading
        </div>
      );
    }
    if (mockPostings.length === 0) {
      return (
        <div data-testid='jobs-list-view-stub'>
          <p>No matching jobs</p>
        </div>
      );
    }
    return (
      <div data-testid='jobs-list-view-stub'>
        <button
          type='button'
          onClick={() =>
            props.onFiltersChange({
              ...props.filters,
              minScore: '70',
            })
          }
        >
          stub-change-filter
        </button>
        <ul>
          {mockPostings.map(p => (
            <li key={p.id} data-testid='posting-row'>
              <button
                type='button'
                aria-label={`Select ${p.title}`}
                onClick={() => {
                  const next = new Set(props.selectedIds);
                  if (next.has(p.id)) next.delete(p.id);
                  else next.add(p.id);
                  props.onSelectionChange(next);
                }}
              >
                {p.title}
              </button>
              <span data-testid={`score-${p.id}`}>{p.score}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  },
}));

// BatchActionBar — stub renders a sentinel only when selectedCount > 0,
// matching the real component's "return null on 0" behaviour.
jest.mock('../BatchActionBar', () => ({
  __esModule: true,
  default: ({ selectedCount }: { selectedCount: number }) =>
    selectedCount === 0 ? null : (
      <div role='toolbar' aria-label='Batch actions'>
        {selectedCount} selected
      </div>
    ),
}));

const POSTINGS: JobPosting[] = [
  {
    id: 'job-1',
    external_id: 'ext-1',
    source_id: 'src-1',
    title: 'Senior Frontend Engineer',
    company_name: 'Acme',
    location: 'Remote',
    absolute_url: 'https://example.com/1',
    score: 82,
    score_breakdown: null,
    scoring_status: 'complete',
    status: 'new',
    salary_text: null,
    greenhouse_updated_at: null,
    first_seen_at: '2026-01-01T00:00:00Z',
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'job-2',
    external_id: 'ext-2',
    source_id: 'src-1',
    title: 'Staff Engineer',
    company_name: 'Globex',
    location: null,
    absolute_url: null,
    score: 64,
    score_breakdown: null,
    scoring_status: 'complete',
    status: 'saved',
    salary_text: null,
    greenhouse_updated_at: null,
    first_seen_at: '2026-01-02T00:00:00Z',
    created_at: '2026-01-02T00:00:00Z',
  },
];

const ORIGINAL_FETCH = global.fetch;

afterAll(() => {
  global.fetch = ORIGINAL_FETCH;
});

beforeEach(() => {
  jest.clearAllMocks();
  mockPostings = [];
  mockLoading = false;
  lastJobsListViewProps = null;
  // Reset the URL-state mock between tests so test order doesn't matter.
  navState.params = new URLSearchParams();
  navState.listeners.clear();
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ activation_status: 'ready', jobs_count: 0 }),
  }) as unknown as typeof fetch;
});

describe('JobsList — empty targets state', () => {
  it('renders the "No active targets" empty state with a CTA to /targets', () => {
    render(<JobsList targetId={undefined} initialTargets={[]} />);

    expect(screen.getByText(/no active targets/i)).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /go to targets/i })
    ).toHaveAttribute('href', '/targets');
    expect(
      screen.queryByRole('group', { name: /filter jobs by target/i })
    ).not.toBeInTheDocument();
  });
});

describe('JobsList — with targets', () => {
  const TARGETS: TargetTab[] = [
    { id: 't1', label: 'Frontend' },
    { id: 't2', label: 'Backend' },
  ];

  it('renders the page heading and a target filter group with "All Jobs" + targets', () => {
    render(<JobsList targetId={undefined} initialTargets={TARGETS} />);

    expect(
      screen.getByRole('heading', { level: 1, name: /jobs/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('group', { name: /filter jobs by target/i })
    ).toBeInTheDocument();
    // No URL ``?target=`` was provided, so the page falls back to the
    // first active target — the API's untargeted list path is broken
    // (filters by an unpopulated ``jobs.target_id`` column) and would
    // render an empty list. Auto-selecting the first tab keeps /jobs
    // useful as a default landing.
    expect(screen.getByRole('button', { name: /^frontend$/i })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByRole('button', { name: /all jobs/i })).toHaveAttribute(
      'aria-pressed',
      'false'
    );
    expect(
      screen.getByRole('button', { name: /backend/i })
    ).toBeInTheDocument();
  });

  it('renders the loading skeleton state via JobsListView', () => {
    mockLoading = true;
    render(<JobsList targetId={undefined} initialTargets={TARGETS} />);

    expect(screen.getByLabelText(/loading jobs/i)).toBeInTheDocument();
  });

  it('renders an empty postings message when JobsListView reports no rows', () => {
    mockPostings = [];
    render(<JobsList targetId={undefined} initialTargets={TARGETS} />);

    expect(screen.getByText(/no matching jobs/i)).toBeInTheDocument();
  });

  it('renders one row per posting with its score badge', () => {
    mockPostings = POSTINGS;
    render(<JobsList targetId={undefined} initialTargets={TARGETS} />);

    expect(screen.getAllByTestId('posting-row')).toHaveLength(2);
    expect(screen.getByTestId('score-job-1')).toHaveTextContent('82');
    expect(screen.getByTestId('score-job-2')).toHaveTextContent('64');
    expect(
      screen.getByRole('button', { name: /select senior frontend engineer/i })
    ).toBeInTheDocument();
  });

  it('forwards filter changes from JobsListView (onFiltersChange wiring)', async () => {
    mockPostings = POSTINGS;
    const user = userEvent.setup();
    render(<JobsList targetId={undefined} initialTargets={TARGETS} />);

    expect(lastJobsListViewProps?.filters.minScore).toBe('');
    await user.click(
      screen.getByRole('button', { name: /stub-change-filter/i })
    );
    await waitFor(() => {
      expect(lastJobsListViewProps?.filters.minScore).toBe('70');
    });
  });

  it('hides the BatchActionBar when no rows are selected', () => {
    mockPostings = POSTINGS;
    render(<JobsList targetId={undefined} initialTargets={TARGETS} />);

    expect(
      screen.queryByRole('toolbar', { name: /batch actions/i })
    ).not.toBeInTheDocument();
  });

  it('shows the BatchActionBar after at least one posting is selected', async () => {
    mockPostings = POSTINGS;
    const user = userEvent.setup();
    render(<JobsList targetId={undefined} initialTargets={TARGETS} />);

    await user.click(
      screen.getByRole('button', { name: /select senior frontend engineer/i })
    );

    expect(
      await screen.findByRole('toolbar', { name: /batch actions/i })
    ).toHaveTextContent(/1 selected/i);
  });

  it('calls router.replace and resets selection when switching tabs', async () => {
    mockPostings = POSTINGS;
    const user = userEvent.setup();
    render(<JobsList targetId={undefined} initialTargets={TARGETS} />);

    await user.click(
      screen.getByRole('button', { name: /select senior frontend engineer/i })
    );
    await user.click(screen.getByRole('button', { name: /^frontend$/i }));

    expect(mockReplace).toHaveBeenCalledWith('/jobs?target=t1', {
      scroll: false,
    });
    // BatchActionBar disappears because selection was reset
    await waitFor(() => {
      expect(
        screen.queryByRole('toolbar', { name: /batch actions/i })
      ).not.toBeInTheDocument();
    });
  });
});
