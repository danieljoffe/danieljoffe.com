import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import FunnelChart from '../FunnelChart';
import type { FunnelStage } from '../../types';

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

const SAMPLE: FunnelStage[] = [
  { stage: 'new', count: 99 }, // explicitly hidden
  { stage: 'saved', count: 5 },
  { stage: 'resume_draft', count: 3 },
  { stage: 'applied', count: 2 },
  { stage: 'offer', count: 0 },
];

describe('FunnelChart', () => {
  it('renders the figure with the funnel aria-label', () => {
    render(<FunnelChart data={SAMPLE} />);
    expect(
      screen.getByRole('figure', { name: /pipeline funnel/i })
    ).toBeInTheDocument();
  });

  it('hides the `new` stage from the rendered table', () => {
    render(<FunnelChart data={SAMPLE} />);
    // Visible rows: Saved, Draft, Applied, Offer (4 stage cells)
    expect(screen.getByRole('cell', { name: 'Saved' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'Draft' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'Applied' })).toBeInTheDocument();
    expect(screen.queryByRole('cell', { name: 'New' })).not.toBeInTheDocument();
  });

  it('renders drill links only for stages with non-zero counts', () => {
    render(<FunnelChart data={SAMPLE} />);
    const nav = screen.getByRole('navigation', { name: /view jobs by stage/i });
    expect(nav).toBeInTheDocument();
    // Saved (5), Draft (3), Applied (2) -> 3 links. Offer has count 0.
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(3);
    expect(screen.getByRole('link', { name: /saved \(5\)/i })).toHaveAttribute(
      'href',
      '/jobs?status=saved'
    );
    expect(screen.getByRole('link', { name: /draft \(3\)/i })).toHaveAttribute(
      'href',
      '/jobs?status=resume_draft'
    );
  });

  it('shows the empty-state message when all stages are zero', () => {
    render(
      <FunnelChart
        data={[
          { stage: 'saved', count: 0 },
          { stage: 'applied', count: 0 },
        ]}
      />
    );
    expect(
      screen.getByText(/save jobs and update their status/i)
    ).toBeInTheDocument();
    expect(screen.queryByRole('figure')).not.toBeInTheDocument();
  });

  it('shows the empty-state message when only `new` is present', () => {
    render(<FunnelChart data={[{ stage: 'new', count: 12 }]} />);
    expect(
      screen.getByText(/save jobs and update their status/i)
    ).toBeInTheDocument();
  });

  it('has no accessibility violations with data', async () => {
    const { container } = render(<FunnelChart data={SAMPLE} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
