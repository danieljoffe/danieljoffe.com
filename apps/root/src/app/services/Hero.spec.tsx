import React from 'react';
import { render, screen } from '@testing-library/react';
import Hero from './Hero';

jest.mock('./HeroCTA', () => ({
  __esModule: true,
  default: () => (
    <a href='https://calendly.com/hello-danieljoffe/30min'>
      Book a Discovery Call
    </a>
  ),
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

  it('renders the anchor link to services grid', () => {
    render(<Hero />);
    const anchor = screen.getByText(/see what i offer/i);
    expect(anchor).toBeInTheDocument();
    expect(anchor.closest('a')).toHaveAttribute(
      'href',
      '#services-grid-heading'
    );
  });
});
