import { render, screen } from '@testing-library/react';
import HeroStats from './HeroStats';
import type { SummaryData } from './types';

function buildData(overrides: Partial<SummaryData> = {}): SummaryData {
  return {
    totalScans: 500,
    uniqueDomains: 120,
    avgOverallScore: 72,
    topViolation: 'Missing alt text',
    ...overrides,
  };
}

describe('HeroStats', () => {
  it('renders the average score when present', () => {
    render(<HeroStats data={buildData({ avgOverallScore: 72 })} />);
    expect(
      screen.getByLabelText('Average score: 72 out of 100')
    ).toBeInTheDocument();
    expect(screen.getByText('72')).toBeInTheDocument();
  });

  it('renders em dash when avgOverallScore is null', () => {
    render(<HeroStats data={buildData({ avgOverallScore: null })} />);
    expect(
      screen.getByLabelText('No score data available')
    ).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('renders total scans and unique domains', () => {
    render(
      <HeroStats data={buildData({ totalScans: 1234, uniqueDomains: 567 })} />
    );
    expect(screen.getByText('1,234')).toBeInTheDocument();
    expect(screen.getByText('567')).toBeInTheDocument();
  });

  it('renders the top violation callout when present', () => {
    render(<HeroStats data={buildData({ topViolation: 'Slow LCP' })} />);
    expect(screen.getByText('Slow LCP')).toBeInTheDocument();
    expect(
      screen.getByText('#1 issue found across all scans')
    ).toBeInTheDocument();
  });

  it('does not render the callout when topViolation is null', () => {
    render(<HeroStats data={buildData({ topViolation: null })} />);
    expect(
      screen.queryByText('#1 issue found across all scans')
    ).not.toBeInTheDocument();
  });

  it('applies green color for scores >= 90', () => {
    render(<HeroStats data={buildData({ avgOverallScore: 95 })} />);
    const el = screen.getByLabelText('Average score: 95 out of 100');
    expect(el.style.color).toBe('rgb(99, 202, 165)');
  });

  it('applies indigo color for scores >= 75', () => {
    render(<HeroStats data={buildData({ avgOverallScore: 80 })} />);
    const el = screen.getByLabelText('Average score: 80 out of 100');
    expect(el.style.color).toBe('rgb(140, 143, 255)');
  });

  it('applies orange color for scores >= 60', () => {
    render(<HeroStats data={buildData({ avgOverallScore: 65 })} />);
    const el = screen.getByLabelText('Average score: 65 out of 100');
    expect(el.style.color).toBe('rgb(255, 180, 107)');
  });

  it('applies rose color for scores >= 40', () => {
    render(<HeroStats data={buildData({ avgOverallScore: 45 })} />);
    const el = screen.getByLabelText('Average score: 45 out of 100');
    expect(el.style.color).toBe('rgb(255, 140, 160)');
  });

  it('applies red color for scores below 40', () => {
    render(<HeroStats data={buildData({ avgOverallScore: 20 })} />);
    const el = screen.getByLabelText('Average score: 20 out of 100');
    expect(el.style.color).toBe('rgb(255, 107, 107)');
  });

  it('applies grey color for null scores', () => {
    render(<HeroStats data={buildData({ avgOverallScore: null })} />);
    const el = screen.getByLabelText('No score data available');
    expect(el.style.color).toBe('rgb(136, 136, 136)');
  });
});
