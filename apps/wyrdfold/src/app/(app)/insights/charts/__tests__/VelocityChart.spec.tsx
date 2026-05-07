import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import VelocityChart from '../VelocityChart';
import type { WeeklyCount } from '../../types';

expect.extend(toHaveNoViolations);

const SAMPLE: WeeklyCount[] = [
  {
    week_start: '2026-04-01',
    resumes_generated: 4,
    applications_submitted: 2,
  },
  {
    week_start: '2026-04-08',
    resumes_generated: 6,
    applications_submitted: 5,
  },
];

describe('VelocityChart', () => {
  it('renders a figure with the weekly-activity aria-label', () => {
    render(<VelocityChart data={SAMPLE} />);
    expect(
      screen.getByRole('figure', { name: /weekly activity/i })
    ).toBeInTheDocument();
  });

  it('renders the SR-only data table with all column headers', () => {
    render(<VelocityChart data={SAMPLE} />);
    expect(
      screen.getByRole('columnheader', { name: 'Week' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('columnheader', { name: 'Resumes' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('columnheader', { name: 'Applications' })
    ).toBeInTheDocument();
  });

  it('renders one data row per week', () => {
    render(<VelocityChart data={SAMPLE} />);
    // 1 header row + 2 body rows = 3 total
    expect(screen.getAllByRole('row')).toHaveLength(3);
  });

  it('shows the empty-state message when data is empty', () => {
    render(<VelocityChart data={[]} />);
    expect(screen.getByText(/no velocity data yet/i)).toBeInTheDocument();
    expect(screen.queryByRole('figure')).not.toBeInTheDocument();
  });

  it('has no accessibility violations with data', async () => {
    const { container } = render(<VelocityChart data={SAMPLE} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
