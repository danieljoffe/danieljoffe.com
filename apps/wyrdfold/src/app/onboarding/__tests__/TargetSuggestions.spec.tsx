import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TargetSuggestions from '../TargetSuggestions';
import type { JobTarget, MatchedSuggestion } from '@/app/(app)/targets/types';

const fetchMock = jest.fn();
global.fetch = fetchMock as unknown as typeof fetch;

beforeEach(() => {
  fetchMock.mockReset();
});

afterEach(() => {
  jest.useRealTimers();
});

function makeTarget(over: Partial<JobTarget> = {}): JobTarget {
  return {
    id: 't1',
    label: 'Senior Engineer',
    description: null,
    normalized_label: null,
    scoring_profile: {
      categories: {},
      seniority: { level: null, signals: [] },
      domain: { signals: [], weight: 0.5 },
      negative: { keywords: [], weight: -10 },
    },
    search_keywords: [],
    activation_status: 'active',
    profile_version: 1,
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...over,
  };
}

function makeSuggestion(
  label: string,
  isNew = true,
  matched: JobTarget | null = null
): MatchedSuggestion {
  return {
    suggestion: {
      label,
      description: `${label} description`,
      core_skills: ['TypeScript', 'React'],
    },
    matched_target: matched,
    is_new: isNew,
  };
}

describe('TargetSuggestions — Path A (jobData provided)', () => {
  it('renders a loading spinner while auto-creating from posting', () => {
    // never resolves — exercises the loading state
    fetchMock.mockReturnValueOnce(
      new Promise(() => {
        // intentionally empty
      })
    );
    render(
      <TargetSuggestions
        onComplete={jest.fn()}
        onSkip={jest.fn()}
        jobData={{ postingId: 'p1', title: 'Eng' }}
      />
    );
    expect(
      screen.getByText(/setting up a target from your job posting/i)
    ).toBeInTheDocument();
  });

  it('shows the created-target card when from-posting succeeds', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ label: 'Senior Engineer' }),
    });
    render(
      <TargetSuggestions
        onComplete={jest.fn()}
        onSkip={jest.fn()}
        jobData={{ postingId: 'p1', title: 'Eng' }}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/target created/i)).toBeInTheDocument();
    });
    expect(screen.getByText('Senior Engineer')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/targets/from-posting/p1',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('shows the error alert when from-posting fails', async () => {
    // First call (Path A) fails. The component then falls through to the
    // suggestions branch — its useEffect early-returns when jobData is set,
    // so no second call fires. The fallback "Set up your job targets"
    // manual prompt is rendered with the error alert above it.
    fetchMock.mockResolvedValueOnce({ ok: false, status: 500 });
    render(
      <TargetSuggestions
        onComplete={jest.fn()}
        onSkip={jest.fn()}
        jobData={{ postingId: 'p1', title: 'Eng' }}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        /could not auto-create target/i
      );
    });
  });
});

describe('TargetSuggestions — Path B/C (no jobData)', () => {
  it('fetches /api/targets/suggest and renders the suggestion cards', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        matches: [
          makeSuggestion('Frontend Engineer', true, null),
          makeSuggestion('Staff Engineer', false, makeTarget({ id: 't2' })),
        ],
      }),
    });

    render(<TargetSuggestions onComplete={jest.fn()} onSkip={jest.fn()} />);

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { level: 2, name: /suggested targets/i })
      ).toBeInTheDocument();
    });

    // Cards rendered as role=checkbox, pre-selected by default
    const frontend = screen.getByRole('checkbox', {
      name: 'Frontend Engineer',
    });
    expect(frontend).toHaveAttribute('aria-checked', 'true');
    const staff = screen.getByRole('checkbox', { name: 'Staff Engineer' });
    expect(staff).toHaveAttribute('aria-checked', 'true');
  });

  it("renders an 'Existing' badge for non-new suggestions", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        matches: [
          makeSuggestion('Staff Engineer', false, makeTarget({ id: 't2' })),
        ],
      }),
    });
    render(<TargetSuggestions onComplete={jest.fn()} onSkip={jest.fn()} />);
    await waitFor(() => {
      expect(screen.getByText(/existing/i)).toBeInTheDocument();
    });
  });

  it('toggles selection when a suggestion card is clicked', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        matches: [makeSuggestion('Frontend Engineer', true, null)],
      }),
    });
    const user = userEvent.setup();
    render(<TargetSuggestions onComplete={jest.fn()} onSkip={jest.fn()} />);

    const card = await screen.findByRole('checkbox', {
      name: 'Frontend Engineer',
    });
    expect(card).toHaveAttribute('aria-checked', 'true'); // pre-selected
    await user.click(card);
    await waitFor(() => {
      expect(card).toHaveAttribute('aria-checked', 'false');
    });
    // Button copy reflects 0 selected
    expect(
      screen.getByRole('button', { name: /continue without targets/i })
    ).toBeInTheDocument();
  });

  it('renders singular vs plural button labels based on selection size', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        matches: [
          makeSuggestion('A'),
          makeSuggestion('B'),
          makeSuggestion('C'),
        ],
      }),
    });
    const user = userEvent.setup();
    render(<TargetSuggestions onComplete={jest.fn()} onSkip={jest.fn()} />);

    // All 3 pre-selected
    expect(
      await screen.findByRole('button', { name: /create 3 targets/i })
    ).toBeInTheDocument();

    await user.click(screen.getByRole('checkbox', { name: 'A' }));
    await user.click(screen.getByRole('checkbox', { name: 'B' }));

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /create 1 target/i })
      ).toBeInTheDocument();
    });
  });

  it('renders the manual fallback when /suggest returns zero matches', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ matches: [] }),
    });
    render(<TargetSuggestions onComplete={jest.fn()} onSkip={jest.fn()} />);

    await waitFor(() => {
      expect(
        screen.getByRole('heading', {
          level: 2,
          name: /set up your job targets/i,
        })
      ).toBeInTheDocument();
    });
    expect(
      screen.getByRole('button', { name: /create your first target/i })
    ).toBeInTheDocument();
  });

  it('renders an error alert when /suggest fails', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 500 });
    render(<TargetSuggestions onComplete={jest.fn()} onSkip={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        /could not generate suggestions/i
      );
    });
  });

  it('invokes onSkip when "Skip for now" is clicked from the manual fallback', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ matches: [] }),
    });
    const onSkip = jest.fn();
    const user = userEvent.setup();
    render(<TargetSuggestions onComplete={jest.fn()} onSkip={onSkip} />);

    const skip = await screen.findByRole('button', { name: /skip for now/i });
    await user.click(skip);
    expect(onSkip).toHaveBeenCalledTimes(1);
  });
});
