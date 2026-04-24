import { render, screen, waitFor } from '@testing-library/react';
import CareerOverview from './CareerOverview';
import type { GapHealthResult, OptimizedDoc, ProseDoc } from './types';

const proseDoc: ProseDoc = {
  id: 'prose-1',
  user_id: null,
  version: 3,
  content: 'Career narrative content goes here.',
  created_at: '2026-04-20T12:00:00Z',
};

const optimizedDoc: OptimizedDoc = {
  id: 'opt-1',
  user_id: null,
  prose_doc_id: 'prose-1',
  version: 2,
  payload: {
    summary: 'Senior FE with a decade of shipped work.',
    roles: [
      {
        id: 'fc',
        company: 'FightCamp',
        title: 'Senior Frontend Engineer',
        start: '2021-11',
        end: '2024-04',
        summary: null,
        skills: ['React'],
        outcome_refs: [],
      },
      {
        id: 'current',
        company: 'Acme',
        title: 'Engineer',
        start: '2024-05',
        end: null,
        summary: null,
        skills: [],
        outcome_refs: [],
      },
    ],
    skills: [
      { name: 'React', evidence_refs: [], years: 8 },
      { name: 'TypeScript', evidence_refs: [], years: 6 },
    ],
    outcomes: [
      {
        description: 'Cut mobile load times from 10s to 2s',
        metric: 'LCP',
        value: '2s',
        role_ref: 'fc',
      },
    ],
  },
  markdown_view: null,
  source: 'llm',
  created_at: '2026-04-21T10:00:00Z',
};

const gapHealthGreen: GapHealthResult = {
  gap_pct: 0,
  tier: 'green',
  gaps: [],
  total_weight: 10,
  gap_weight: 0,
};

const gapHealthRed: GapHealthResult = {
  gap_pct: 72,
  tier: 'red',
  gaps: [
    {
      kind: 'role.missing_outcomes',
      ref: 'fc',
      priority: 10,
      context: 'Senior Frontend Engineer at FightCamp has no outcomes.',
    },
    {
      kind: 'outcome.missing_metric',
      ref: 'Cut mobile load times',
      priority: 20,
      context: "Outcome lacks a quantified metric: 'Cut mobile load times'",
    },
  ],
  total_weight: 25,
  gap_weight: 18,
};

const gapHealthYellow: GapHealthResult = {
  gap_pct: 30,
  tier: 'yellow',
  gaps: [
    {
      kind: 'role.missing_summary',
      ref: 'fc',
      priority: 30,
      context: 'Senior Frontend Engineer at FightCamp has no summary sentence.',
    },
  ],
  total_weight: 10,
  gap_weight: 3,
};

function mockFetch(
  prose: unknown,
  optimized: unknown,
  gapHealth: unknown = gapHealthGreen,
  status = 200
): void {
  (global.fetch as jest.Mock) = jest.fn((input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input.toString();
    let body: unknown;
    if (url.includes('/gap-health')) body = gapHealth;
    else if (url.endsWith('/prose')) body = prose;
    else body = optimized;
    return Promise.resolve({
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(body),
    }) as unknown as Promise<Response>;
  });
}

describe('CareerOverview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows a spinner while loading', () => {
    (global.fetch as jest.Mock) = jest.fn(
      () =>
        new Promise(() => {
          // intentionally never resolves — keeps the component in its loading state
        })
    );
    render(<CareerOverview />);
    expect(screen.getByLabelText(/loading career data/i)).toBeInTheDocument();
  });

  it('renders prose content and optimized summary when both are populated', async () => {
    mockFetch(proseDoc, optimizedDoc);
    render(<CareerOverview />);

    await waitFor(() =>
      expect(
        screen.getByText(/career narrative content goes here/i)
      ).toBeInTheDocument()
    );

    expect(screen.getByText(/v3/)).toBeInTheDocument();
    expect(
      screen.getByText(/senior fe with a decade of shipped work/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/2 roles · 2 skills · 1 outcome/i)
    ).toBeInTheDocument();
    expect(screen.getAllByText(/FightCamp/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Acme/)).toBeInTheDocument();
    expect(screen.getByText(/2024-05 - present/)).toBeInTheDocument();
  });

  it('renders empty state when prose is null', async () => {
    mockFetch({ prose: null }, { optimized: null });
    render(<CareerOverview />);
    await waitFor(() =>
      expect(
        screen.getByText(/no prose doc yet\. start an onboarding conversation/i)
      ).toBeInTheDocument()
    );
  });

  it('renders empty state when optimized is null', async () => {
    mockFetch(proseDoc, { optimized: null });
    render(<CareerOverview />);
    await waitFor(() =>
      expect(
        screen.getByText(/no optimized doc yet\. derive one via/i)
      ).toBeInTheDocument()
    );
  });

  it('shows an error message when the fetch fails', async () => {
    (global.fetch as jest.Mock) = jest.fn(() =>
      Promise.resolve({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'boom' }),
      })
    );
    render(<CareerOverview />);
    await waitFor(() =>
      expect(screen.getByText(/error loading career data/i)).toBeInTheDocument()
    );
  });

  it('issues requests to all three career proxy endpoints', async () => {
    mockFetch({ prose: null }, { optimized: null });
    render(<CareerOverview />);
    await waitFor(() =>
      expect(screen.getByText(/no prose doc yet/i)).toBeInTheDocument()
    );
    const urls = (global.fetch as jest.Mock).mock.calls.map((call: unknown[]) =>
      String(call[0])
    );
    expect(urls).toContain('/api/career/experience/prose');
    expect(urls).toContain('/api/career/experience/optimized');
    expect(urls).toContain('/api/career/experience/gap-health');
  });

  // Gap health card tests (#498)

  it('renders gap health card with progress bar and tier badge', async () => {
    mockFetch(proseDoc, optimizedDoc, gapHealthRed);
    render(<CareerOverview />);

    await waitFor(() =>
      expect(screen.getByText(/gap health/i)).toBeInTheDocument()
    );

    expect(screen.getByText('red')).toBeInTheDocument();
    expect(screen.getByText(/28% complete/i)).toBeInTheDocument();
    expect(screen.getByText(/fix gaps/i)).toBeInTheDocument();
  });

  it('shows gap details in the gap health card', async () => {
    mockFetch(proseDoc, optimizedDoc, gapHealthRed);
    render(<CareerOverview />);

    await waitFor(() =>
      expect(screen.getByText(/gap health/i)).toBeInTheDocument()
    );

    expect(
      screen.getByText(/outcome lacks a quantified metric/i)
    ).toBeInTheDocument();
  });

  it('hides "Fix gaps" link when gap_pct is 0', async () => {
    mockFetch(proseDoc, optimizedDoc, gapHealthGreen);
    render(<CareerOverview />);

    await waitFor(() =>
      expect(screen.getByText(/gap health/i)).toBeInTheDocument()
    );

    expect(screen.getByText(/100% complete/i)).toBeInTheDocument();
    expect(screen.queryByText(/fix gaps/i)).not.toBeInTheDocument();
  });

  it('renders yellow tier with warning badge', async () => {
    mockFetch(proseDoc, optimizedDoc, gapHealthYellow);
    render(<CareerOverview />);

    await waitFor(() =>
      expect(screen.getByText(/gap health/i)).toBeInTheDocument()
    );

    expect(screen.getByText('yellow')).toBeInTheDocument();
    expect(screen.getByText(/70% complete/i)).toBeInTheDocument();
    expect(screen.getByText(/fix gaps/i)).toBeInTheDocument();
  });
});
