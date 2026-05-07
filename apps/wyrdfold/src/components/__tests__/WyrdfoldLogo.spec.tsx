import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import WyrdfoldLogo from '../WyrdfoldLogo';

expect.extend(toHaveNoViolations);

describe('WyrdfoldLogo', () => {
  it('renders an accessible img with default aria-label "Wyrdfold"', () => {
    render(<WyrdfoldLogo />);
    expect(screen.getByRole('img', { name: 'Wyrdfold' })).toBeInTheDocument();
  });

  it('respects a custom aria-label', () => {
    render(<WyrdfoldLogo aria-label='Home — Wyrdfold' />);
    expect(
      screen.getByRole('img', { name: 'Home — Wyrdfold' })
    ).toBeInTheDocument();
  });

  it('renders as decorative (presentation) when aria-hidden is true', () => {
    const { container } = render(<WyrdfoldLogo aria-hidden />);
    // No img role exposed
    expect(screen.queryByRole('img')).toBeNull();
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).not.toHaveAttribute('aria-label');
    // No <title> rendered when hidden — title would be announced.
    expect(svg?.querySelector('title')).toBeNull();
  });

  it('respects the size prop on width + height', () => {
    const { container } = render(<WyrdfoldLogo size={48} />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '48');
    expect(svg).toHaveAttribute('height', '48');
  });

  it('applies a custom color via inline style', () => {
    const { container } = render(<WyrdfoldLogo color='#ff0000' />);
    const svg = container.querySelector('svg') as SVGSVGElement;
    expect(svg.style.color).toBe('rgb(255, 0, 0)');
  });

  it('passes through className', () => {
    const { container } = render(<WyrdfoldLogo className='custom-class' />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('class')).toContain('custom-class');
  });

  it('has no accessibility violations (visible variant)', async () => {
    const { container } = render(<WyrdfoldLogo />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('has no accessibility violations (decorative variant)', async () => {
    const { container } = render(
      <button type='button' aria-label='Home'>
        <WyrdfoldLogo aria-hidden />
      </button>
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
