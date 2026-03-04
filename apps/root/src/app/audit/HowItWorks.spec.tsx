import { render, screen } from '@testing-library/react';
import HowItWorks from './HowItWorks';

describe('HowItWorks', () => {
  it('renders the section heading', () => {
    render(<HowItWorks />);
    expect(
      screen.getByRole('heading', { name: /how it works/i })
    ).toBeInTheDocument();
  });

  it('renders all three steps', () => {
    render(<HowItWorks />);
    expect(screen.getByText('Paste your URL')).toBeInTheDocument();
    expect(screen.getByText('Get your report')).toBeInTheDocument();
    expect(screen.getByText('Fix what matters')).toBeInTheDocument();
  });

  it('renders step numbers', () => {
    render(<HowItWorks />);
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('renders step descriptions', () => {
    render(<HowItWorks />);
    expect(screen.getByText(/enter any website address/i)).toBeInTheDocument();
    expect(
      screen.getByText(/performance, accessibility, SEO/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/prioritized recommendations/i)
    ).toBeInTheDocument();
  });

  it('renders as an ordered list', () => {
    render(<HowItWorks />);
    const list = screen.getByRole('list');
    expect(list).toBeInTheDocument();
  });

  it('has proper accessibility attributes', () => {
    render(<HowItWorks />);
    const heading = screen.getByRole('heading', { name: /how it works/i });
    expect(heading).toHaveAttribute('id', 'how-it-works-heading');
  });
});
