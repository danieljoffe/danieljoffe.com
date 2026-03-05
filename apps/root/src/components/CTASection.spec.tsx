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
        <a href='/about'>Contact</a>
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
        <a href='/about'>Contact me</a>
        <a href='/projects'>View projects</a>
      </CTASection>
    );
    expect(
      screen.getByRole('link', { name: 'Contact me' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'View projects' })
    ).toBeInTheDocument();
  });

  it('sets the heading id for aria-labelledby', () => {
    render(
      <CTASection
        headingId='test-cta'
        heading='Ready to start?'
        description='Get in touch today.'
      >
        <a href='/about'>Contact</a>
      </CTASection>
    );
    const heading = screen.getByRole('heading', { name: 'Ready to start?' });
    expect(heading).toHaveAttribute('id', 'test-cta');
  });
});
