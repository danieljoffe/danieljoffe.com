import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import ScoreDistributionChart from '../ScoreDistributionChart';
import type { ScoreBucket } from '../../types';

expect.extend(toHaveNoViolations);

jest.mock('next/link', () => {
  return function MockLink(
    props: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }
  ) {
    const { href, children, ...rest } = props;
    return (
      <a href={href} {...rest}>
        {children}
      </a>
    );
  };
});

const SAMPLE: ScoreBucket[] = [
  { bucket: '0-39', count: 2 },
  { bucket: '40-69', count: 5 },
  { bucket: '70-100', count: 3 },
];

describe('ScoreDistributionChart', () => {
  it('renders the figure with the score-distribution aria-label', () => {
    render(<ScoreDistributionChart data={SAMPLE} />);
    expect(
      screen.getByRole('figure', { name: /score distribution/i })
    ).toBeInTheDocument();
  });

  it('renders one drill link per non-zero bucket using the bucket low end', () => {
    render(<ScoreDistributionChart data={SAMPLE} />);
    const nav = screen.getByRole('navigation', { name: /view jobs by score/i });
    expect(nav).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /0\+ \(2\)/ })).toHaveAttribute(
      'href',
      '/jobs?minScore=0'
    );
    expect(screen.getByRole('link', { name: /40\+ \(5\)/ })).toHaveAttribute(
      'href',
      '/jobs?minScore=40'
    );
    expect(screen.getByRole('link', { name: /70\+ \(3\)/ })).toHaveAttribute(
      'href',
      '/jobs?minScore=70'
    );
  });

  it('omits drill links for empty buckets', () => {
    render(
      <ScoreDistributionChart
        data={[
          { bucket: '0-39', count: 0 },
          { bucket: '40-69', count: 4 },
        ]}
      />
    );
    // Anchor with ^ to avoid matching `40+` (which contains `0+`).
    expect(
      screen.queryByRole('link', { name: /^0\+/ })
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /40\+ \(4\)/ })
    ).toBeInTheDocument();
  });

  it('shows the empty-state message when all buckets are zero', () => {
    render(
      <ScoreDistributionChart
        data={[
          { bucket: '0-39', count: 0 },
          { bucket: '70-100', count: 0 },
        ]}
      />
    );
    expect(screen.getByText(/no scored jobs yet/i)).toBeInTheDocument();
    expect(screen.queryByRole('figure')).not.toBeInTheDocument();
  });

  it('reports the unscored count in the empty state when provided', () => {
    render(<ScoreDistributionChart data={[]} unscoredCount={3} />);
    expect(
      screen.getByText(/3 jobs are waiting to be scored/i)
    ).toBeInTheDocument();
  });

  it('singularizes the unscored-count message for one job', () => {
    render(<ScoreDistributionChart data={[]} unscoredCount={1} />);
    expect(
      screen.getByText(/1 job is waiting to be scored/i)
    ).toBeInTheDocument();
  });

  it('shows the unscored count footer alongside data when provided', () => {
    render(<ScoreDistributionChart data={SAMPLE} unscoredCount={2} />);
    expect(
      screen.getByText(/2 jobs are waiting to be scored — not shown above/i)
    ).toBeInTheDocument();
  });

  it('has no accessibility violations with data', async () => {
    const { container } = render(
      <ScoreDistributionChart data={SAMPLE} unscoredCount={1} />
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
