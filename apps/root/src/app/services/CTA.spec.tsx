import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import CTA from './CTA';

// Mock analytics
jest.mock('@/lib/analytics', () => ({
  analytics: {
    ctaClick: jest.fn(),
  },
}));

describe('Services CTA', () => {
  it('renders the section heading', () => {
    render(<CTA />);
    expect(
      screen.getByRole('heading', { name: /let's figure out how i can help/i })
    ).toBeInTheDocument();
  });

  it('renders the description text', () => {
    render(<CTA />);
    expect(screen.getByText(/Book a free 30-minute call/i)).toBeInTheDocument();
    expect(
      screen.getByText(/No contracts, no commitments/i)
    ).toBeInTheDocument();
  });

  it('renders the CTA button with correct link', () => {
    render(<CTA />);
    const ctaLink = screen.getByRole('link', {
      name: /book a discovery call/i,
    });
    expect(ctaLink).toBeInTheDocument();
    expect(ctaLink).toHaveAttribute(
      'href',
      'https://calendly.com/hello-danieljoffe/30min'
    );
  });

  it('has proper accessibility attributes', () => {
    render(<CTA />);
    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading).toHaveAttribute('id', 'services-cta-heading');
  });

  it('triggers analytics when CTA is clicked', async () => {
    const { analytics } = await import('@/lib/analytics');
    render(<CTA />);
    const ctaLink = screen.getByRole('link', {
      name: /book a discovery call/i,
    });
    fireEvent.click(ctaLink);
    expect(analytics.ctaClick).toHaveBeenCalledWith(
      'services_cta_discovery_call',
      'https://calendly.com/hello-danieljoffe/30min'
    );
  });
});
