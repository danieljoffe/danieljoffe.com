import React from 'react';
import { render, screen } from '@testing-library/react';
import { MetricsDashboard, type Metric } from './MetricsDashboard';

const sampleMetrics: Metric[] = [
  {
    label: 'First Contentful Paint',
    before: '8-12s',
    after: '1.8-2.5s',
    improvement: '~80% faster',
    delta: 'positive',
  },
  {
    label: 'Bundle Size',
    before: '650-800KB',
    after: '250-300KB',
    improvement: '~62% reduction',
    delta: 'positive',
  },
  {
    label: 'Lighthouse Score',
    before: '32-43',
    after: '~80',
    improvement: '+40 points',
    delta: 'positive',
  },
];

describe('MetricsDashboard', () => {
  it('renders all metric cards', () => {
    render(<MetricsDashboard metrics={sampleMetrics} />);

    expect(screen.getByText('First Contentful Paint')).toBeInTheDocument();
    expect(screen.getByText('Bundle Size')).toBeInTheDocument();
    expect(screen.getByText('Lighthouse Score')).toBeInTheDocument();
  });

  it('displays before and after values', () => {
    render(<MetricsDashboard metrics={sampleMetrics} />);

    expect(screen.getByText('8-12s')).toBeInTheDocument();
    expect(screen.getByText('1.8-2.5s')).toBeInTheDocument();
  });

  it('displays improvement badges', () => {
    render(<MetricsDashboard metrics={sampleMetrics} />);

    expect(screen.getByText('~80% faster')).toBeInTheDocument();
    expect(screen.getByText('~62% reduction')).toBeInTheDocument();
    expect(screen.getByText('+40 points')).toBeInTheDocument();
  });

  it('renders with proper ARIA region', () => {
    render(<MetricsDashboard metrics={sampleMetrics} />);

    const region = screen.getByRole('region', {
      name: 'Performance metrics comparison',
    });
    expect(region).toBeInTheDocument();
  });

  it('applies green styling when delta is positive', () => {
    render(
      <MetricsDashboard
        metrics={[
          {
            label: 'Component Library Adoption',
            before: '0%',
            after: '80%',
            improvement: 'Unified UI patterns',
            delta: 'positive',
          },
        ]}
      />
    );

    const badge = screen.getByText('Unified UI patterns');
    expect(badge.className).toContain('green');
  });

  it('applies red styling when delta is negative', () => {
    render(
      <MetricsDashboard
        metrics={[
          {
            label: 'Response Time',
            before: '200ms',
            after: '500ms',
            improvement: '150% slower',
            delta: 'negative',
          },
        ]}
      />
    );

    const badge = screen.getByText('150% slower');
    expect(badge.className).toContain('red');
    expect(badge.className).not.toContain('green');
  });

  it('applies green styling when delta is neutral', () => {
    render(
      <MetricsDashboard
        metrics={[
          {
            label: 'Team Size',
            before: '3',
            after: '7',
            improvement: 'Team capability',
            delta: 'neutral',
          },
        ]}
      />
    );

    const badge = screen.getByText('Team capability');
    expect(badge.className).toContain('green');
  });

  it('renders empty state gracefully', () => {
    const { container } = render(<MetricsDashboard metrics={[]} />);
    const region = container.querySelector('[role="region"]');
    expect(region).toBeInTheDocument();
    expect(region?.children.length).toBe(0);
  });
});
