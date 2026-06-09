import React from 'react';
import '@testing-library/jest-dom';
import { act, render, screen, waitFor } from '@testing-library/react';
import TargetsList from '../TargetsList';
import {
  emptyScoringProfile,
  toSummary,
  type JobTarget,
  type UserTarget,
  type UserTargetWithSummary,
  type UserTargetWithTarget,
} from '../types';

const mockPush = jest.fn();
const mockRefresh = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    prefetch: jest.fn(),
    refresh: mockRefresh,
  }),
}));

const mockToast = jest.fn();
jest.mock('@/state/Toast/ToastProvider', () => ({
  useToast: () => ({ toast: mockToast }),
}));

// CreateTargetModal renders a Dialog/Portal; stub it out so the list test
// stays focused on the list surface (modal mechanics covered separately).
jest.mock('../CreateTargetModal', () => ({
  __esModule: true,
  default: () => null,
}));

function makeEntry(
  id: string,
  label: string,
  overrides: {
    activation_status?: string;
    fit_score?: number | null;
    categories?: JobTarget['scoring_profile']['categories'];
  } = {}
): UserTargetWithTarget {
  const target: JobTarget = {
    id,
    label,
    description: null,
    normalized_label: null,
    scoring_profile: {
      ...emptyScoringProfile(),
      categories: overrides.categories ?? {},
    },
    search_keywords: [],
    activation_status: overrides.activation_status ?? 'ready',
    profile_version: 1,
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-04-30T00:00:00Z',
  };
  const userTarget: UserTarget = {
    id: `u-${id}`,
    user_id: 'user',
    target_id: id,
    is_active: true,
    fit_score: overrides.fit_score ?? null,
    fit_score_reasoning: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-04-30T00:00:00Z',
  };
  return { user_target: userTarget, target };
}

/** List state holds summaries (#863) — the server `/targets/mine` feed and
 * the create/poll boundaries all project full targets down via `toSummary`. */
function makeSummaryEntry(
  ...args: Parameters<typeof makeEntry>
): UserTargetWithSummary {
  const entry = makeEntry(...args);
  return { user_target: entry.user_target, target: toSummary(entry.target) };
}

describe('TargetsList', () => {
  it('renders an empty-state CTA cluster when there are no targets', () => {
    render(<TargetsList initialTargets={[]} />);
    expect(screen.getByText(/No targets yet/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /create target/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /suggest from experience/i })
    ).toBeInTheDocument();
  });

  it('renders one card per target plus add/suggest buttons below the grid when populated', () => {
    render(
      <TargetsList
        initialTargets={[
          makeSummaryEntry('t-1', 'Senior Frontend Engineer'),
          makeSummaryEntry('t-2', 'Full Stack Engineer'),
        ]}
      />
    );
    expect(screen.getByText('Senior Frontend Engineer')).toBeInTheDocument();
    expect(screen.getByText('Full Stack Engineer')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /^add target$/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /suggest from experience/i })
    ).toBeInTheDocument();
  });

  describe('deriving polling', () => {
    const originalFetch = global.fetch;
    afterEach(() => {
      jest.useRealTimers();
      global.fetch = originalFetch;
    });

    function mockFetchResolving(entry: UserTargetWithTarget): jest.Mock {
      const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => entry,
      });
      global.fetch = fetchMock as unknown as typeof fetch;
      return fetchMock;
    }

    it('polls a deriving target and swaps in the derived profile + fit score', async () => {
      jest.useFakeTimers();
      const derived = makeEntry('t-1', 'Senior Frontend Engineer', {
        activation_status: 'ready',
        fit_score: 88,
        categories: {
          frontend: {
            keywords: { react: 3, typescript: 2, vue: 1, svelte: 1 },
            weight: 1,
          },
        },
      });
      const fetchMock = mockFetchResolving(derived);

      render(
        <TargetsList
          initialTargets={[
            makeSummaryEntry('t-1', 'Senior Frontend Engineer', {
              activation_status: 'deriving',
              fit_score: null,
            }),
          ]}
        />
      );

      // Starts in the deriving state.
      expect(screen.getByText(/building/i)).toBeInTheDocument();

      // Advance to the first poll; the settled response replaces the card.
      await act(async () => {
        await jest.advanceTimersByTimeAsync(2500);
      });

      expect(fetchMock).toHaveBeenCalledWith('/api/targets/t-1/user-target');
      await waitFor(() => {
        expect(screen.queryByText(/building/i)).toBeNull();
      });
      expect(screen.getByText('88')).toBeInTheDocument();
      // Counts derived from the full /user-target response via toSummary.
      expect(screen.getByText('4')).toBeInTheDocument(); // keyword count
    });

    it('stops polling once the target settles', async () => {
      jest.useFakeTimers();
      const derived = makeEntry('t-1', 'Senior Frontend Engineer', {
        activation_status: 'ready',
        fit_score: 75,
        categories: { frontend: { keywords: { react: 3 }, weight: 1 } },
      });
      const fetchMock = mockFetchResolving(derived);

      render(
        <TargetsList
          initialTargets={[
            makeSummaryEntry('t-1', 'Senior Frontend Engineer', {
              activation_status: 'deriving',
            }),
          ]}
        />
      );

      await act(async () => {
        await jest.advanceTimersByTimeAsync(2500);
      });
      const callsAfterSettle = fetchMock.mock.calls.length;

      // Further time passes — no additional polls once settled.
      await act(async () => {
        await jest.advanceTimersByTimeAsync(2500 * 3);
      });
      expect(fetchMock.mock.calls.length).toBe(callsAfterSettle);
    });
  });
});
