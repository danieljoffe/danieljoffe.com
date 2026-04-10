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

  it('renders service selection guide', () => {
    render(<Page />);
    expect(
      screen.getByRole('heading', {
        name: /not sure which service/i,
      })
    ).toBeInTheDocument();
  });

  it('renders all pain point matcher cards', () => {
    render(<Page />);
    expect(
      screen.getByText(/my site is slow and we're losing conversions/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /our team rebuilds the same components on every project/i
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /marketing depends on engineering for every content change/i
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText(/we have a product idea but no frontend team/i)
    ).toBeInTheDocument();
  });

  it('renders comparison table section', () => {
    render(<Page />);
    expect(screen.getByText(/compare services/i)).toBeInTheDocument();
  });

  it('renders structured data script', () => {
    const { container } = render(<Page />);
    const script = container.querySelector(
      'script[type="application/ld+json"]'
    );
    expect(script).toBeInTheDocument();
  });
});
