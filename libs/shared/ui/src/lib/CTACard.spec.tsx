import { render, screen } from '@testing-library/react';
import { CTACard } from './CTACard';

describe('CTACard', () => {
  it('renders heading', () => {
    render(
      <CTACard heading='Get Started' description='Description'>
        <button>CTA</button>
      </CTACard>
    );
    expect(screen.getByText('Get Started')).toBeInTheDocument();
  });

  it('renders description', () => {
    render(
      <CTACard heading='Title' description='Some description text'>
        <button>CTA</button>
      </CTACard>
    );
    expect(screen.getByText('Some description text')).toBeInTheDocument();
  });

  it('renders children', () => {
    render(
      <CTACard heading='Title' description='Desc'>
        <button>Click me</button>
      </CTACard>
    );
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <CTACard heading='Title' description='Desc' className='mt-8'>
        <button>CTA</button>
      </CTACard>
    );
    expect(container.firstChild).toHaveClass('mt-8');
  });
});
