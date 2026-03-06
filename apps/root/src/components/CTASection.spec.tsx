import { render, screen } from '@testing-library/react';
import CTASection from './CTASection';

describe('CTASection', () => {
  it('renders heading and description', () => {
    render(
      <CTASection
        headingId='test-cta'
        heading='Ready to start?'
        description='Get in touch today.'
      >
        <span>Contact</span>
      </CTASection>
    );
    expect(
      screen.getByRole('heading', { name: 'Ready to start?' })
    ).toBeInTheDocument();
    expect(screen.getByText('Get in touch today.')).toBeInTheDocument();
  });

  it('renders children', () => {
    render(
      <CTASection
        headingId='test-cta'
        heading='Ready to start?'
        description='Get in touch today.'
      >
        <span>Contact me</span>
        <span>View projects</span>
      </CTASection>
    );
    expect(screen.getByText('Contact me')).toBeInTheDocument();
    expect(screen.getByText('View projects')).toBeInTheDocument();
  });

  it('sets the heading id for aria-labelledby', () => {
    render(
      <CTASection
        headingId='test-cta'
        heading='Ready to start?'
        description='Get in touch today.'
      >
        <span>Contact</span>
      </CTASection>
    );
    const heading = screen.getByRole('heading', { name: 'Ready to start?' });
    expect(heading).toHaveAttribute('id', 'test-cta');
  });
});
