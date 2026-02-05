import React from 'react';
import { render, screen } from '@testing-library/react';
import ServicesGrid from './ServicesGrid';

describe('ServicesGrid', () => {
  it('renders all four service cards', () => {
    render(<ServicesGrid />);
    expect(
      screen.getByText(/Performance Audits & Optimization/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Component Libraries & Design Systems/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/CMS & Self-Serve Tooling/i)).toBeInTheDocument();
    expect(
      screen.getByText(/MVP & Product Frontend Builds/i)
    ).toBeInTheDocument();
  });

  it('renders service descriptions', () => {
    render(<ServicesGrid />);
    expect(
      screen.getByText(/Your site is slow and users are bouncing/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Your codebase has inconsistent UI/i)
    ).toBeInTheDocument();
  });

  it('renders "What you get" sections with deliverables', () => {
    render(<ServicesGrid />);
    const whatYouGetLabels = screen.getAllByText(/What you get:/i);
    expect(whatYouGetLabels).toHaveLength(4);
  });

  it('renders pricing information', () => {
    render(<ServicesGrid />);
    expect(screen.getByText(/\$5,000/)).toBeInTheDocument();
    expect(screen.getByText(/\$10,000/)).toBeInTheDocument();
    expect(screen.getByText(/\$8,000/)).toBeInTheDocument();
    expect(screen.getByText(/\$12,000/)).toBeInTheDocument();
  });

  it('renders timeline information', () => {
    render(<ServicesGrid />);
    expect(screen.getByText(/2-4 weeks/)).toBeInTheDocument();
    expect(screen.getByText(/4-8 weeks/)).toBeInTheDocument();
    expect(screen.getByText(/3-6 weeks/)).toBeInTheDocument();
    expect(screen.getByText(/4-12 weeks/)).toBeInTheDocument();
  });

  it('renders proof/testimonials for each service', () => {
    render(<ServicesGrid />);
    expect(
      screen.getByText(/Cut mobile load times from 10s to 2s/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Built a React component library adopted by 80%/i)
    ).toBeInTheDocument();
  });

  it('renders service cards as list items', () => {
    render(<ServicesGrid />);
    const lists = screen.getAllByRole('list');
    expect(lists.length).toBeGreaterThanOrEqual(1);
    const listItems = screen.getAllByRole('listitem');
    // 4 service cards + multiple deliverable items per card
    expect(listItems.length).toBeGreaterThanOrEqual(4);
  });
});
