import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import HeroCTA from './HeroCTA';

jest.mock('@/lib/analytics', () => ({
  analytics: {
    ctaClick: jest.fn(),
  },
}));

describe('Services HeroCTA', () => {
  it('renders a link to Calendly', () => {
    render(<HeroCTA />);
    const link = screen.getByRole('link', {
      name: /book a discovery call/i,
    });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute(
      'href',
      'https://calendly.com/hello-danieljoffe/30min'
    );
  });

  it('does not set an aria-label', () => {
    render(<HeroCTA />);
    const link = screen.getByRole('link');
    expect(link).not.toHaveAttribute('aria-label');
  });

  it('triggers analytics when clicked', async () => {
    const { analytics } = await import('@/lib/analytics');
    render(<HeroCTA />);
    const link = screen.getByRole('link');
    fireEvent.click(link);
    expect(analytics.ctaClick).toHaveBeenCalledWith(
      'services_hero_cta',
      'https://calendly.com/hello-danieljoffe/30min'
    );
  });
});
