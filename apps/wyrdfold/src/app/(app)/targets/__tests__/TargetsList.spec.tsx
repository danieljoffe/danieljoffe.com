import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import TargetsList from '../TargetsList';
import {
  emptyScoringProfile,
  type JobTarget,
  type UserTarget,
  type UserTargetWithTarget,
} from '../types';

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, prefetch: jest.fn() }),
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

function makeEntry(id: string, label: string): UserTargetWithTarget {
  const target: JobTarget = {
    id,
    label,
    description: null,
    normalized_label: null,
    scoring_profile: emptyScoringProfile(),
    search_keywords: [],
    activation_status: 'ready',
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
    fit_score: null,
    fit_score_reasoning: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-04-30T00:00:00Z',
  };
  return { user_target: userTarget, target };
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

  it('renders one card per target plus a top-right add button when populated', () => {
    render(
      <TargetsList
        initialTargets={[
          makeEntry('t-1', 'Senior Frontend Engineer'),
          makeEntry('t-2', 'Full Stack Engineer'),
        ]}
      />
    );
    expect(screen.getByText('Senior Frontend Engineer')).toBeInTheDocument();
    expect(screen.getByText('Full Stack Engineer')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /^create target$/i })
    ).toBeInTheDocument();
  });
});
