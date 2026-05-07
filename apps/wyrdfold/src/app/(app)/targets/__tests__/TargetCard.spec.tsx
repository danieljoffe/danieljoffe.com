import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TargetCard from '../TargetCard';
import { emptyScoringProfile, type JobTarget } from '../types';

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

function makeTarget(overrides: Partial<JobTarget> = {}): JobTarget {
  return {
    id: 't-1',
    label: 'Senior Frontend Engineer',
    description: null,
    normalized_label: null,
    scoring_profile: {
      ...emptyScoringProfile(),
      categories: {
        frontend: { keywords: { react: 3, typescript: 2 }, weight: 1 },
      },
    },
    search_keywords: [],
    activation_status: 'ready',
    profile_version: 1,
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-04-30T00:00:00Z',
    ...overrides,
  };
}

const noop = () => undefined;

describe('TargetCard', () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  it('renders the target label', () => {
    render(
      <TargetCard
        target={makeTarget()}
        fitScore={null}
        fitScoreReasoning={null}
        onActivate={noop}
        onDeactivate={noop}
        onDelete={noop}
        onViewJobs={noop}
      />
    );
    expect(screen.getByText('Senior Frontend Engineer')).toBeInTheDocument();
  });

  it('shows a fit-score badge when fitScore is provided', () => {
    render(
      <TargetCard
        target={makeTarget()}
        fitScore={92}
        fitScoreReasoning='Great match'
        onActivate={noop}
        onDeactivate={noop}
        onDelete={noop}
        onViewJobs={noop}
      />
    );
    expect(screen.getByText('92')).toBeInTheDocument();
  });

  it('omits the fit-score badge when fitScore is null', () => {
    render(
      <TargetCard
        target={makeTarget()}
        fitScore={null}
        fitScoreReasoning={null}
        onActivate={noop}
        onDeactivate={noop}
        onDelete={noop}
        onViewJobs={noop}
      />
    );
    // With fitScore=92 the badge text would be "92"; assert that's absent.
    expect(screen.queryByText('92')).toBeNull();
  });

  it('navigates to /targets/<id> when the card is activated by click', async () => {
    const user = userEvent.setup();
    render(
      <TargetCard
        target={makeTarget()}
        fitScore={null}
        fitScoreReasoning={null}
        onActivate={noop}
        onDeactivate={noop}
        onDelete={noop}
        onViewJobs={noop}
      />
    );
    const card = screen.getByRole('button', {
      name: /open target senior frontend engineer/i,
    });
    await user.click(card);
    expect(mockPush).toHaveBeenCalledWith('/targets/t-1');
  });

  it('shows an "Active" status when target.is_active is true', () => {
    render(
      <TargetCard
        target={makeTarget({ is_active: true })}
        fitScore={null}
        fitScoreReasoning={null}
        onActivate={noop}
        onDeactivate={noop}
        onDelete={noop}
        onViewJobs={noop}
      />
    );
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('shows an "Inactive" status when target.is_active is false', () => {
    render(
      <TargetCard
        target={makeTarget({ is_active: false })}
        fitScore={null}
        fitScoreReasoning={null}
        onActivate={noop}
        onDeactivate={noop}
        onDelete={noop}
        onViewJobs={noop}
      />
    );
    expect(screen.getByText('Inactive')).toBeInTheDocument();
  });
});
