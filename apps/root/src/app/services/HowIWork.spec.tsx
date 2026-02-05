import React from 'react';
import { render, screen } from '@testing-library/react';
import HowIWork from './HowIWork';

describe('HowIWork', () => {
  it('renders the section heading', () => {
    render(<HowIWork />);
    expect(
      screen.getByRole('heading', { name: /how i work/i })
    ).toBeInTheDocument();
  });

  it('renders all four steps', () => {
    render(<HowIWork />);
    expect(screen.getByText(/Discovery Call \(Free\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Scope & Proposal/i)).toBeInTheDocument();
    expect(screen.getByText(/Build & Ship/i)).toBeInTheDocument();
    expect(screen.getByText(/Handoff & Support/i)).toBeInTheDocument();
  });

  it('renders step numbers', () => {
    render(<HowIWork />);
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
  });

  it('renders step descriptions', () => {
    render(<HowIWork />);
    expect(
      screen.getByText(/We talk about your problem, timeline, and budget/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/You get a clear scope document with deliverables/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/I work in weekly sprints with async updates/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Clean code, documentation, and a walkthrough/i)
    ).toBeInTheDocument();
  });

  it('renders as an ordered list', () => {
    render(<HowIWork />);
    const list = screen.getByRole('list');
    expect(list).toBeInTheDocument();
  });

  it('has proper accessibility attributes', () => {
    render(<HowIWork />);
    const heading = screen.getByRole('heading', { name: /how i work/i });
    expect(heading).toHaveAttribute('id', 'how-i-work-heading');
  });
});
