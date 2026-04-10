import { render, screen } from '@testing-library/react';
import Page from './page';

jest.mock('./HeroCTA', () => ({
  __esModule: true,
  default: function HeroCTA() {
    return <div data-testid='hero-cta' />;
  },
}));

jest.mock('./FAQ', () => ({
  __esModule: true,
  default: function FAQ() {
    return <div data-testid='faq' />;
  },
}));

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
    metrics: Array<{ label: string }>;
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

describe('Services Page', () => {
  it('renders inside PageLayout wrapper', () => {
    render(<Page />);
    const main = screen.getByRole('main');
    expect(main).toBeInTheDocument();
  });

  it('renders Hero section with heading', () => {
    render(<Page />);
    expect(
      screen.getByRole('heading', {
        name: /your frontend is costing you users/i,
      })
    ).toBeInTheDocument();
  });

  it('renders services grid', () => {
    render(<Page />);
    expect(screen.getByText(/services/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Performance Audits & Optimization/i)
    ).toBeInTheDocument();
  });

  it('renders How I Work section', () => {
    render(<Page />);
    expect(screen.getByText(/how i work/i)).toBeInTheDocument();
  });

  it('renders Who I Work Best With section', () => {
    render(<Page />);
    expect(screen.getByText(/who i work best with/i)).toBeInTheDocument();
  });

  it('renders FAQ section', () => {
    render(<Page />);
    expect(screen.getByTestId('faq')).toBeInTheDocument();
  });

  it('renders CTA section', () => {
    render(<Page />);
    expect(
      screen.getByRole('heading', {
        name: /let's figure out how i can help/i,
      })
    ).toBeInTheDocument();
  });

  it('renders Performance Audits section', () => {
    render(<Page />);
    expect(
      screen.getByRole('heading', {
        name: /your site takes 8 seconds to load/i,
      })
    ).toBeInTheDocument();
  });

  it('renders structured data script', () => {
    const { container } = render(<Page />);
    const script = container.querySelector(
      'script[type="application/ld+json"]'
    );
    expect(script).toBeInTheDocument();
  });
});
