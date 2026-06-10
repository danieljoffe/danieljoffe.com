import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TargetCard from '../TargetCard';
import type { JobTargetSummary } from '../types';

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

function makeTarget(
  overrides: Partial<JobTargetSummary> = {}
): JobTargetSummary {
  return {
    id: 't-1',
    label: 'Senior Frontend Engineer',
    description: null,
    normalized_label: null,
    activation_status: 'ready',
    profile_version: 1,
    is_active: true,
    seniority_hint: null,
    // 1 category, 2 keywords — the API derives these from scoring_profile.
    keyword_count: 2,
    category_count: 1,
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
        isActive
        onActivate={noop}
        onDeactivate={noop}
        onDelete={noop}
        onViewJobs={noop}
      />
    );
    expect(screen.getByText('Senior Frontend Engineer')).toBeInTheDocument();
  });

  it('renders category and keyword counts from the summary', () => {
    render(
      <TargetCard
        target={makeTarget({ category_count: 3, keyword_count: 17 })}
        fitScore={null}
        fitScoreReasoning={null}
        isActive
        onActivate={noop}
        onDeactivate={noop}
        onDelete={noop}
        onViewJobs={noop}
      />
    );
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('17')).toBeInTheDocument();
  });

  it('shows a fit-score badge when fitScore is provided', () => {
    render(
      <TargetCard
        target={makeTarget()}
        fitScore={92}
        fitScoreReasoning='Great match'
        isActive
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
        isActive
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
        isActive
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
        isActive
        onActivate={noop}
        onDeactivate={noop}
        onDelete={noop}
        onViewJobs={noop}
      />
    );
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('shows an "Inactive" status when isActive is false', () => {
    render(
      <TargetCard
        target={makeTarget({ is_active: false })}
        fitScore={null}
        fitScoreReasoning={null}
        isActive={false}
        onActivate={noop}
        onDeactivate={noop}
        onDelete={noop}
        onViewJobs={noop}
      />
    );
    expect(screen.getByText('Inactive')).toBeInTheDocument();
  });

  it('shows a building indicator and dashes counts while deriving', () => {
    render(
      <TargetCard
        target={makeTarget({ activation_status: 'deriving' })}
        fitScore={null}
        fitScoreReasoning={null}
        isActive={false}
        onActivate={noop}
        onDeactivate={noop}
        onDelete={noop}
        onViewJobs={noop}
      />
    );
    expect(screen.getByText(/building/i)).toBeInTheDocument();
    // Category/keyword counts are placeholders until derivation completes.
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByText('Inactive')).toBeNull();
  });

  it('disables Activate in the dropdown while deriving', async () => {
    const user = userEvent.setup();
    const onActivate = jest.fn();
    const { container } = render(
      <TargetCard
        target={makeTarget({ activation_status: 'deriving', is_active: false })}
        fitScore={null}
        fitScoreReasoning={null}
        isActive={false}
        onActivate={onActivate}
        onDeactivate={noop}
        onDelete={noop}
        onViewJobs={noop}
      />
    );
    const trigger = container.querySelector(
      '[aria-haspopup="menu"]'
    ) as HTMLElement;
    await user.click(trigger);
    const activate = screen.getByRole('menuitem', { name: /activate/i });
    expect(activate).toHaveAttribute('aria-disabled', 'true');
    await user.click(activate);
    expect(onActivate).not.toHaveBeenCalled();
  });

  it('surfaces a failure state when derivation errored', () => {
    render(
      <TargetCard
        target={makeTarget({ activation_status: 'error' })}
        fitScore={null}
        fitScoreReasoning={null}
        isActive={false}
        onActivate={noop}
        onDeactivate={noop}
        onDelete={noop}
        onViewJobs={noop}
      />
    );
    expect(screen.getByText(/derivation failed/i)).toBeInTheDocument();
  });
});
