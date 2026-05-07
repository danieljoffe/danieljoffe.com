import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import InsightsDashboard from '../InsightsDashboard';

// Stub the heavy chart components — they're dynamically imported and pull in
// recharts. The dashboard's responsibility is to wire data into them; the
// charts have their own coverage.
jest.mock('../charts/CostChart', () => ({
  __esModule: true,
  default: () => <div data-testid='cost-chart' />,
}));
jest.mock('../charts/FunnelChart', () => ({
  __esModule: true,
  default: () => <div data-testid='funnel-chart' />,
}));
jest.mock('../charts/ScoreDistributionChart', () => ({
  __esModule: true,
  default: () => <div data-testid='score-distribution-chart' />,
}));
jest.mock('../charts/SkillFrequencyChart', () => ({
  __esModule: true,
  default: () => <div data-testid='skill-frequency-chart' />,
}));
jest.mock('../charts/TopSkillGaps', () => ({
  __esModule: true,
  default: () => <div data-testid='top-skill-gaps' />,
}));
jest.mock('../charts/TargetComparisonChart', () => ({
  __esModule: true,
  default: () => <div data-testid='target-comparison-chart' />,
}));
jest.mock('../charts/VelocityChart', () => ({
  __esModule: true,
  default: () => <div data-testid='velocity-chart' />,
}));

const mockUseInsights = jest.fn();
jest.mock('@/hooks/useInsights', () => ({
  useInsights: (period: unknown) => mockUseInsights(period),
}));

const mockDownload = jest.fn();
jest.mock('../exportCsv', () => ({
  downloadInsightsCsv: (...args: unknown[]) => mockDownload(...args),
}));

const LOADING_STATE = {
  pipeline: undefined,
  targets: undefined,
  skillsCost: undefined,
  loading: {
    pipeline: true,
    targets: true,
    skillsCost: true,
    any: true,
    all: true,
  },
  error: undefined,
  failedEndpoints: [],
  fetchedAt: undefined,
  refresh: () => undefined,
};

const READY_STATE = {
  pipeline: {
    velocity: [],
    funnel: [],
    total_applications: 5,
    total_interviews: 1,
    response_rate: 0.2,
    avg_days_to_response: 10,
    previous: null,
  },
  targets: { targets: [], score_distribution: [], score_trend: [] },
  skillsCost: {
    top_skills: [],
    top_missing: [],
    cost_over_time: [],
    cost_by_purpose: [],
    total_cost: 0,
    avg_cost_per_resume: 0,
  },
  loading: {
    pipeline: false,
    targets: false,
    skillsCost: false,
    any: false,
    all: false,
  },
  error: undefined,
  failedEndpoints: [],
  fetchedAt: Date.now(),
  refresh: () => undefined,
};

beforeEach(() => {
  mockUseInsights.mockReset();
  mockDownload.mockReset();
});

describe('InsightsDashboard', () => {
  it('renders the period filter with 30d selected by default', () => {
    mockUseInsights.mockReturnValue(LOADING_STATE);
    render(<InsightsDashboard />);
    expect(
      screen.getByRole('button', { name: '30d', pressed: true })
    ).toBeInTheDocument();
  });

  it('updates the period when a different option is pressed', async () => {
    mockUseInsights.mockReturnValue(LOADING_STATE);
    const user = userEvent.setup();
    render(<InsightsDashboard />);
    await user.click(screen.getByRole('button', { name: '90d' }));
    await waitFor(() => {
      expect(mockUseInsights).toHaveBeenLastCalledWith('90d');
    });
  });

  it('shows an error banner when useInsights returns an error', () => {
    mockUseInsights.mockReturnValue({
      ...LOADING_STATE,
      error: 'Failed to load insights data.',
      loading: {
        pipeline: false,
        targets: false,
        skillsCost: false,
        any: false,
        all: false,
      },
    });
    render(<InsightsDashboard />);
    expect(screen.getByRole('alert')).toHaveTextContent(
      /Failed to load insights data/i
    );
  });

  it('disables the download button while loading', () => {
    mockUseInsights.mockReturnValue(LOADING_STATE);
    render(<InsightsDashboard />);
    expect(
      screen.getByRole('button', { name: /Download insights/i })
    ).toBeDisabled();
  });

  it('calls downloadInsightsCsv when the download button is clicked', async () => {
    mockUseInsights.mockReturnValue(READY_STATE);
    const user = userEvent.setup();
    render(<InsightsDashboard />);
    await user.click(
      screen.getByRole('button', { name: /Download insights/i })
    );
    expect(mockDownload).toHaveBeenCalledWith(
      expect.objectContaining({
        period: '30d',
        pipeline: READY_STATE.pipeline,
        targets: READY_STATE.targets,
        skillsCost: READY_STATE.skillsCost,
      })
    );
  });
});
