import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import CostChart from '../CostChart';
import type { CostBucket } from '../../types';

expect.extend(toHaveNoViolations);

// recharts uses ResponsiveContainer which depends on parent dimensions —
// jsdom returns 0 for layout, so the SVG never renders. We assert against
// the SR-only data table that ChartFigure provides; that's the canonical
// text representation users with assistive tech (and tests) consume.

const SAMPLE: CostBucket[] = [
  { week_start: '2026-04-01', total_cost: 1.23, resume_count: 3 },
  { week_start: '2026-04-08', total_cost: 4.56, resume_count: 7 },
];

describe('CostChart', () => {
  it('renders a figure with the chart aria-label when given data', () => {
    render(<CostChart data={SAMPLE} />);
    expect(
      screen.getByRole('figure', { name: /llm cost/i })
    ).toBeInTheDocument();
  });

  it('renders the SR-only data table with cost and resume columns', () => {
    render(<CostChart data={SAMPLE} />);
    expect(
      screen.getByRole('columnheader', { name: 'Week' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('columnheader', { name: 'Cost' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('columnheader', { name: 'Resumes' })
    ).toBeInTheDocument();
    // Currency formatter renders $1.23 / $4.56
    expect(screen.getByRole('cell', { name: '$1.23' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: '$4.56' })).toBeInTheDocument();
  });

  it('shows the empty-state message when data is empty', () => {
    render(<CostChart data={[]} />);
    expect(screen.getByText(/no cost data yet/i)).toBeInTheDocument();
    expect(screen.queryByRole('figure')).not.toBeInTheDocument();
  });

  it('has no accessibility violations with data', async () => {
    const { container } = render(<CostChart data={SAMPLE} />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('has no accessibility violations in empty state', async () => {
    const { container } = render(<CostChart data={[]} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
