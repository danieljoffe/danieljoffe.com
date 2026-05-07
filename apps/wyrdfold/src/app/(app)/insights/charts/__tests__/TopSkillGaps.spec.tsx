import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import TopSkillGaps from '../TopSkillGaps';
import type { MissingSkill } from '../../types';

expect.extend(toHaveNoViolations);

const SAMPLE: MissingSkill[] = [
  {
    skill: 'Kubernetes',
    missing_count: 7,
    avg_job_score: 82.4,
    priority_score: 5,
  },
  {
    skill: 'Rust',
    missing_count: 1,
    avg_job_score: null,
    priority_score: 1,
  },
];

describe('TopSkillGaps', () => {
  it('renders an ordered list with one item per skill gap', () => {
    render(<TopSkillGaps data={SAMPLE} />);
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(screen.getByText('Kubernetes')).toBeInTheDocument();
    expect(screen.getByText('Rust')).toBeInTheDocument();
  });

  it('pluralizes the missing-jobs label for >1 jobs', () => {
    render(<TopSkillGaps data={SAMPLE} />);
    expect(screen.getByText(/missing in 7 jobs/i)).toBeInTheDocument();
  });

  it('singularizes the missing-jobs label for one job', () => {
    render(<TopSkillGaps data={SAMPLE} />);
    expect(screen.getByText(/missing in 1 job$/i)).toBeInTheDocument();
  });

  it('renders the avg job score badge with an aria-label when present', () => {
    render(<TopSkillGaps data={SAMPLE} />);
    // Math.round(82.4) -> 82
    expect(screen.getByLabelText('average job score 82')).toBeInTheDocument();
  });

  it('omits the avg-score badge when avg_job_score is null', () => {
    const second = SAMPLE[1];
    if (!second) throw new Error('SAMPLE[1] missing');
    render(<TopSkillGaps data={[second]} />);
    expect(
      screen.queryByLabelText(/average job score/i)
    ).not.toBeInTheDocument();
  });

  it('shows the empty-state message when data is empty', () => {
    render(<TopSkillGaps data={[]} />);
    expect(screen.getByText(/no skill gaps yet/i)).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('has no accessibility violations with data', async () => {
    const { container } = render(<TopSkillGaps data={SAMPLE} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
