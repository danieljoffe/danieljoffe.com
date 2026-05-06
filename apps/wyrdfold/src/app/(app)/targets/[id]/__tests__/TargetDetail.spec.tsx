import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import TargetDetail from '../TargetDetail';
import type { JobTarget } from '../../types';

const mockToast = jest.fn();
jest.mock('@/state/Toast/ToastProvider', () => ({
  useToast: () => ({ toast: mockToast }),
}));

// Children are exercised in their own specs; stub them so this spec only
// proves the section composition + loading / not-found switch.
jest.mock('../ScoringProfileEditor', () => ({
  __esModule: true,
  default: () => <div data-testid='scoring-profile-editor-stub' />,
}));
jest.mock('../ReferenceJDList', () => ({
  __esModule: true,
  default: () => <div data-testid='reference-jd-list-stub' />,
}));
jest.mock('../TargetDetailSkeleton', () => ({
  __esModule: true,
  default: () => <div data-testid='target-detail-skeleton-stub' />,
}));

const ORIGINAL_FETCH = global.fetch;

const TARGET: JobTarget = {
  id: 't-1',
  label: 'Senior Frontend Engineer',
  description: 'Frontend roles I want to pursue',
  normalized_label: null,
  scoring_profile: {
    categories: {},
    seniority: { level: null, signals: [] },
    domain: { signals: [], weight: 0.5 },
    negative: { keywords: [], weight: -10 },
  },
  search_keywords: [],
  activation_status: 'ready',
  profile_version: 1,
  is_active: true,
  created_at: '2026-01-01',
  updated_at: '2026-01-01',
};

beforeEach(() => {
  jest.clearAllMocks();
});

afterAll(() => {
  global.fetch = ORIGINAL_FETCH;
});

describe('TargetDetail', () => {
  it('renders the skeleton while initial fetches are in flight', () => {
    global.fetch = jest
      .fn()
      .mockImplementation(
        () => new Promise(() => undefined)
      ) as unknown as typeof fetch;

    render(<TargetDetail id='t-1' />);
    expect(
      screen.getByTestId('target-detail-skeleton-stub')
    ).toBeInTheDocument();
  });

  it('renders the target heading and section stubs once loaded', async () => {
    global.fetch = jest.fn().mockImplementation((input: string) => {
      if (input.endsWith('/reference-jds')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ reference_jds: [] }),
        });
      }
      return Promise.resolve({ ok: true, json: async () => TARGET });
    }) as unknown as typeof fetch;

    render(<TargetDetail id='t-1' />);

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: /senior frontend engineer/i,
      })
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('scoring-profile-editor-stub')
    ).toBeInTheDocument();
    expect(screen.getByTestId('reference-jd-list-stub')).toBeInTheDocument();
    // Active badge
    expect(screen.getByText(/^active$/i)).toBeInTheDocument();
    // Back link
    expect(
      screen.getByRole('link', { name: /back to targets/i })
    ).toHaveAttribute('href', '/targets');
  });

  it('renders the "Target not found" state when the target fetch fails', async () => {
    global.fetch = jest.fn().mockImplementation((input: string) => {
      if (input.endsWith('/reference-jds')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ reference_jds: [] }),
        });
      }
      return Promise.resolve({ ok: false, json: async () => ({}) });
    }) as unknown as typeof fetch;

    render(<TargetDetail id='t-1' />);

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { level: 1, name: /target not found/i })
      ).toBeInTheDocument();
    });
    expect(
      screen.getByRole('link', { name: /back to targets/i })
    ).toHaveAttribute('href', '/targets');
  });
});
