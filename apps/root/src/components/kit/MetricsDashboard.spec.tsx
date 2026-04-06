import React from 'react';
import { render, screen } from '@testing-library/react';
import { MetricsDashboard, type Metric } from './MetricsDashboard';

const sampleMetrics: Metric[] = [
  {
    label: 'First Contentful Paint',
    before: '8-12s',
    after: '1.8-2.5s',
    improvement: '~80% faster',
  },
  {
    label: 'Bundle Size',
    before: '650-800KB',
    after: '250-300KB',
    improvement: '~62% reduction',
  },
  {
    label: 'Lighthouse Score',
    before: '32-43',
    after: '~80',
    improvement: '+40 points',
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

  it('applies green styling for positive improvements', () => {
    render(
      <MetricsDashboard
        metrics={[
          {
            label: 'Speed',
            before: '10s',
            after: '2s',
            improvement: '80% faster',
          },
        ]}
      />
    );

    const badge = screen.getByText('80% faster');
    expect(badge.className).toContain('green');
  });

  it('renders empty state gracefully', () => {
    const { container } = render(<MetricsDashboard metrics={[]} />);
    const region = container.querySelector('[role="region"]');
    expect(region).toBeInTheDocument();
    expect(region?.children.length).toBe(0);
  });
});
