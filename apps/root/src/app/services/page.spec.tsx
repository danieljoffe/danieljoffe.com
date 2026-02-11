import { render, screen } from '@testing-library/react';
import Page from './page';

jest.mock('./Hero', () => ({
  __esModule: true,
  default: function Hero() {
    return <div data-testid='services-hero' />;
  },
}));

jest.mock('./ServicesGrid', () => ({
  __esModule: true,
  default: function ServicesGrid() {
    return <div data-testid='services-grid' />;
  },
}));

jest.mock('./HowIWork', () => ({
  __esModule: true,
  default: function HowIWork() {
    return <div data-testid='how-i-work' />;
  },
}));

jest.mock('./WhoIWorkWith', () => ({
  __esModule: true,
  default: function WhoIWorkWith() {
    return <div data-testid='who-i-work-with' />;
  },
}));

jest.mock('./FAQ', () => ({
  __esModule: true,
  default: function FAQ() {
    return <div data-testid='faq' />;
  },
}));

jest.mock('./CTA', () => ({
  __esModule: true,
  default: function CTA() {
    return <div data-testid='services-cta' />;
  },
}));

describe('Services Page', () => {
  it('renders inside MainContent wrapper', () => {
    render(<Page />);
    const main = screen.getByRole('main');
    expect(main).toHaveAttribute('id', 'main-content');
  });

  it('renders Hero section', () => {
    render(<Page />);
    expect(screen.getByTestId('services-hero')).toBeInTheDocument();
  });

  it('renders ServicesGrid section', () => {
    render(<Page />);
    expect(screen.getByTestId('services-grid')).toBeInTheDocument();
  });

  it('renders HowIWork section', () => {
    render(<Page />);
    expect(screen.getByTestId('how-i-work')).toBeInTheDocument();
  });

  it('renders WhoIWorkWith section', () => {
    render(<Page />);
    expect(screen.getByTestId('who-i-work-with')).toBeInTheDocument();
  });

  it('renders FAQ section', () => {
    render(<Page />);
    expect(screen.getByTestId('faq')).toBeInTheDocument();
  });

  it('renders CTA section', () => {
    render(<Page />);
    expect(screen.getByTestId('services-cta')).toBeInTheDocument();
  });

  it('renders structured data script', () => {
    const { container } = render(<Page />);
    const script = container.querySelector(
      'script[type="application/ld+json"]'
    );
    expect(script).toBeInTheDocument();
  });
});
