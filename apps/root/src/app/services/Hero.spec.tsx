import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Hero from './Hero';

// Mock analytics
jest.mock('@/lib/analytics', () => ({
  analytics: {
    ctaClick: jest.fn(),
  },
}));

describe('Services Hero', () => {
  it('renders the main heading', () => {
    render(<Hero />);
    expect(
      screen.getByRole('heading', {
        name: /your frontend is costing you users/i,
      })
    ).toBeInTheDocument();
  });

  it('renders the availability badge', () => {
    render(<Hero />);
    expect(screen.getByText(/available for new projects/i)).toBeInTheDocument();
  });

  it('renders the subheadline', () => {
    render(<Hero />);
    expect(
      screen.getByText(/I help startups and growing teams/i)
    ).toBeInTheDocument();
  });

  it('renders the CTA button with correct link', () => {
    render(<Hero />);
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
    render(<Hero />);
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveAttribute('id', 'services-hero-heading');
  });

  it('triggers analytics when CTA is clicked', async () => {
    const { analytics } = await import('@/lib/analytics');
    render(<Hero />);
    const ctaLink = screen.getByRole('link', {
      name: /book a discovery call/i,
    });
    fireEvent.click(ctaLink);
    expect(analytics.ctaClick).toHaveBeenCalledWith(
      'services_hero_cta',
      'https://calendly.com/hello-danieljoffe/30min'
    );
  });
});
