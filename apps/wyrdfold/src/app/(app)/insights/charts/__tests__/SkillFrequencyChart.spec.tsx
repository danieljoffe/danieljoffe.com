import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import SkillFrequencyChart from '../SkillFrequencyChart';
import type { SkillFrequency } from '../../types';

expect.extend(toHaveNoViolations);

const SAMPLE: SkillFrequency[] = [
  { skill: 'TypeScript', matched_count: 8, missing_count: 2 },
  { skill: 'GraphQL', matched_count: 1, missing_count: 5 },
];

describe('SkillFrequencyChart', () => {
  it('renders a figure with the skill-mentions aria-label', () => {
    render(<SkillFrequencyChart data={SAMPLE} />);
    expect(
      screen.getByRole('figure', { name: /skill mentions/i })
    ).toBeInTheDocument();
  });

  it('renders one row per skill in the SR data table', () => {
    render(<SkillFrequencyChart data={SAMPLE} />);
    expect(
      screen.getByRole('columnheader', { name: 'Skill' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('columnheader', { name: 'Matched' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('columnheader', { name: 'Missing' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('cell', { name: 'TypeScript' })
    ).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'GraphQL' })).toBeInTheDocument();
  });

  it('renders the visible matched/missing legend labels', () => {
    render(<SkillFrequencyChart data={SAMPLE} />);
    // "Matched"/"Missing" appear in both the visible legend (inside <span>)
    // and the SR-only column headers (<th>). Disambiguate by tag.
    expect(
      screen.getByText('Matched', { selector: 'span' })
    ).toBeInTheDocument();
    expect(
      screen.getByText('Missing', { selector: 'span' })
    ).toBeInTheDocument();
  });

  it('shows the empty-state message when data is empty', () => {
    render(<SkillFrequencyChart data={[]} />);
    expect(screen.getByText(/no skill data yet/i)).toBeInTheDocument();
    expect(screen.queryByRole('figure')).not.toBeInTheDocument();
  });

  it('has no accessibility violations with data', async () => {
    const { container } = render(<SkillFrequencyChart data={SAMPLE} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
