import { render, screen } from '@testing-library/react';
import type { Metric } from '@/components/kit/MetricsDashboard';
import { ServiceSection, type ServiceSectionProps } from './ServiceSection';

jest.mock('@/components/Button', () => ({
  __esModule: true,
  default: function Button({
    children,
    href,
    name,
  }: {
    children: React.ReactNode;
    href?: string;
    name?: string;
  }) {
    return (
      <a href={href} data-testid={`button-${name}`}>
        {children}
      </a>
    );
  },
}));

jest.mock('@/components/kit/MetricsDashboard', () => ({
  MetricsDashboard: function MetricsDashboard({
    metrics,
  }: {
    metrics: Metric[];
  }) {
    return (
      <div data-testid='metrics-dashboard'>
        {metrics.map(m => (
          <span key={m.label}>{m.label}</span>
        ))}
      </div>
    );
  },
}));

const sampleMetrics: Metric[] = [
  {
    label: 'Lighthouse Score',
    before: '32',
    after: '80',
    improvement: '+48 points',
    delta: 'positive',
  },
  {
    label: 'Bundle Size',
    before: '800KB',
    after: '300KB',
    improvement: '62% reduction',
    delta: 'positive',
  },
];

const defaultProps: ServiceSectionProps = {
  id: 'perf-audits',
  painPoint: {
    headline: 'Your site takes 8 seconds to load.',
    subtext: "You're losing 53% of mobile visitors.",
  },
  description:
    'I measure exactly what slows your site down, fix the biggest bottlenecks, and prove the improvement with before/after metrics.',
  questions: [
    {
      question: 'How is this different from PageSpeed Insights?',
      answer: 'I go beyond scores and actually fix the issues.',
    },
    {
      question: 'Do Core Web Vitals affect SEO?',
      answer: 'Yes, Google uses them as a ranking signal.',
    },
  ],
  deliverables: [
    'Lighthouse & Core Web Vitals audit report',
    'Prioritized fix recommendations',
    'Before/after performance metrics',
  ],
  proof: {
    title: 'FightCamp Performance Overhaul',
    metrics: sampleMetrics,
    caseStudySlug: 'fightcamp',
  },
  timeline: '2-4 weeks',
  price: '$5,000',
  ctaLabel: undefined,
  ctaHref: undefined,
};

describe('ServiceSection', () => {
  it('renders the section with correct id', () => {
    const { container } = render(<ServiceSection {...defaultProps} />);
    const section = container.querySelector('section#perf-audits');
    expect(section).toBeInTheDocument();
  });

  it('renders the pain point headline', () => {
    render(<ServiceSection {...defaultProps} />);
    expect(
      screen.getByRole('heading', {
        name: /your site takes 8 seconds to load/i,
      })
    ).toBeInTheDocument();
  });

  it('renders the pain point subtext when provided', () => {
    render(<ServiceSection {...defaultProps} />);
    expect(
      screen.getByText(/you're losing 53% of mobile visitors/i)
    ).toBeInTheDocument();
  });

  it('does not render subtext when undefined', () => {
    render(
      <ServiceSection
        {...defaultProps}
        painPoint={{ headline: 'Headline only', subtext: undefined }}
      />
    );
    expect(screen.queryByText(/losing/i)).not.toBeInTheDocument();
  });

  it('renders the service description', () => {
    render(<ServiceSection {...defaultProps} />);
    expect(
      screen.getByText(/I measure exactly what slows your site down/i)
    ).toBeInTheDocument();
  });

  it('renders common questions as dt/dd pairs', () => {
    render(<ServiceSection {...defaultProps} />);
    const terms = screen.getAllByRole('term');
    const definitions = screen.getAllByRole('definition');
    expect(terms).toHaveLength(2);
    expect(definitions).toHaveLength(2);
    expect(terms[0]).toHaveTextContent(
      'How is this different from PageSpeed Insights?'
    );
    expect(definitions[0]).toHaveTextContent(
      'I go beyond scores and actually fix the issues.'
    );
  });

  it('renders all deliverables with check marks', () => {
    render(<ServiceSection {...defaultProps} />);
    expect(
      screen.getByText('Lighthouse & Core Web Vitals audit report')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Prioritized fix recommendations')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Before/after performance metrics')
    ).toBeInTheDocument();
  });

  it('renders MetricsDashboard when metrics are provided', () => {
    render(<ServiceSection {...defaultProps} />);
    expect(screen.getByTestId('metrics-dashboard')).toBeInTheDocument();
    expect(screen.getByText('Lighthouse Score')).toBeInTheDocument();
    expect(screen.getByText('Bundle Size')).toBeInTheDocument();
  });

  it('renders fallback card when metrics array is empty', () => {
    render(
      <ServiceSection
        {...defaultProps}
        proof={{ ...defaultProps.proof, metrics: [] }}
      />
    );
    expect(screen.queryByTestId('metrics-dashboard')).not.toBeInTheDocument();
    expect(
      screen.getByText('See how this played out in practice.')
    ).toBeInTheDocument();
  });

  it('renders case study link with correct href', () => {
    render(<ServiceSection {...defaultProps} />);
    const link = screen.getByTestId('button-perf-audits-case-study');
    expect(link).toHaveAttribute('href', '/projects/fightcamp');
    expect(link).toHaveTextContent('View case study');
  });

  it('renders timeline and price', () => {
    render(<ServiceSection {...defaultProps} />);
    expect(screen.getByText('2-4 weeks')).toBeInTheDocument();
    expect(screen.getByText('$5,000')).toBeInTheDocument();
  });

  it('renders default CTA when ctaLabel and ctaHref are undefined', () => {
    render(<ServiceSection {...defaultProps} />);
    const cta = screen.getByTestId('button-service-cta-perf-audits');
    expect(cta).toHaveTextContent('Book a free call');
    expect(cta).toHaveAttribute('href', '#calendly');
  });

  it('renders custom CTA when provided', () => {
    render(
      <ServiceSection
        {...defaultProps}
        ctaLabel='Get started'
        ctaHref='/contact'
      />
    );
    const cta = screen.getByTestId('button-service-cta-perf-audits');
    expect(cta).toHaveTextContent('Get started');
    expect(cta).toHaveAttribute('href', '/contact');
  });

  it('renders the proof section title', () => {
    render(<ServiceSection {...defaultProps} />);
    expect(
      screen.getByRole('heading', {
        name: /fightcamp performance overhaul/i,
      })
    ).toBeInTheDocument();
  });
});
