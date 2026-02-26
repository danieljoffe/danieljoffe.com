import { render, screen } from '@testing-library/react';
import CTASection from './CTASection';

jest.mock('@/lib/analytics', () => ({
  analytics: { auditCalendlyClicked: jest.fn() },
}));

jest.mock('next-transition-router', () => ({
  Link: ({
    children,
    ...props
  }: React.PropsWithChildren<
    React.AnchorHTMLAttributes<HTMLAnchorElement>
  >) => <a {...props}>{children}</a>,
}));

describe('CTASection', () => {
  it('renders the heading', () => {
    render(<CTASection />);
    expect(
      screen.getByRole('heading', { name: 'Want these fixed?' })
    ).toBeInTheDocument();
  });

  it('renders the description text', () => {
    render(<CTASection />);
    expect(
      screen.getByText(/ship faster, more accessible websites/i)
    ).toBeInTheDocument();
  });

  it('renders the CalendlyButton', () => {
    render(<CTASection />);
    expect(screen.getByText('Book a free discovery call')).toBeInTheDocument();
  });

  it('has proper aria-labelledby on the section', () => {
    render(<CTASection />);
    const heading = screen.getByRole('heading', { name: 'Want these fixed?' });
    expect(heading).toHaveAttribute('id', 'cta-heading');
  });
});
