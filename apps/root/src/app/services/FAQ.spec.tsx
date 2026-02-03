import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import FAQ from './FAQ';

describe('FAQ', () => {
  it('renders all FAQ answers (hidden initially)', () => {
    render(<FAQ />);
    // All answers should be present in the DOM but visually hidden
    expect(
      screen.getByText(/I take on 1-2 projects at a time/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/I prefer project-based pricing/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/React, Next.js, TypeScript, Vue\/Nuxt/i)
    ).toBeInTheDocument();
  });

  it('starts with all items collapsed', () => {
    render(<FAQ />);
    const buttons = screen.getAllByRole('button');
    buttons.forEach(button => {
      expect(button).toHaveAttribute('aria-expanded', 'false');
    });
  });

  it('renders the section heading', () => {
    render(<FAQ />);
    expect(
      screen.getByRole('heading', { name: /frequently asked questions/i })
    ).toBeInTheDocument();
  });

  it('renders all FAQ questions as buttons', () => {
    render(<FAQ />);
    expect(
      screen.getByRole('button', { name: /what's your availability/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /do you do hourly work/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /what's your tech stack/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', {
        name: /can you work with my existing team/i,
      })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /what about ongoing maintenance/i })
    ).toBeInTheDocument();
  });

  it('expands FAQ item when clicked', () => {
    render(<FAQ />);
    const firstQuestion = screen.getByRole('button', {
      name: /what's your availability/i,
    });

    expect(firstQuestion).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(firstQuestion);

    expect(firstQuestion).toHaveAttribute('aria-expanded', 'true');
    expect(
      screen.getByText(/I take on 1-2 projects at a time/i)
    ).toBeInTheDocument();
  });

  it('collapses FAQ item when clicked again', () => {
    render(<FAQ />);
    const firstQuestion = screen.getByRole('button', {
      name: /what's your availability/i,
    });

    fireEvent.click(firstQuestion);
    expect(firstQuestion).toHaveAttribute('aria-expanded', 'true');

    fireEvent.click(firstQuestion);
    expect(firstQuestion).toHaveAttribute('aria-expanded', 'false');
  });

  it('only allows one FAQ item to be open at a time', () => {
    render(<FAQ />);
    const firstQuestion = screen.getByRole('button', {
      name: /what's your availability/i,
    });
    const secondQuestion = screen.getByRole('button', {
      name: /do you do hourly work/i,
    });

    fireEvent.click(firstQuestion);
    expect(firstQuestion).toHaveAttribute('aria-expanded', 'true');
    expect(secondQuestion).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(secondQuestion);
    expect(firstQuestion).toHaveAttribute('aria-expanded', 'false');
    expect(secondQuestion).toHaveAttribute('aria-expanded', 'true');
  });

  it('has proper accessibility attributes on heading', () => {
    render(<FAQ />);
    const heading = screen.getByRole('heading', {
      name: /frequently asked questions/i,
    });
    expect(heading).toHaveAttribute('id', 'faq-heading');
  });

  it('renders chevron icons that rotate when expanded', () => {
    render(<FAQ />);
    const firstQuestion = screen.getByRole('button', {
      name: /what's your availability/i,
    });

    // Initially chevron should not be rotated
    const chevron = firstQuestion.querySelector('svg');
    expect(chevron).not.toHaveClass('rotate-180');

    // After clicking, chevron should be rotated
    fireEvent.click(firstQuestion);
    expect(chevron).toHaveClass('rotate-180');

    // After clicking again, chevron should not be rotated
    fireEvent.click(firstQuestion);
    expect(chevron).not.toHaveClass('rotate-180');
  });

  it('toggles answer visibility with proper max-height', () => {
    render(<FAQ />);
    const firstQuestion = screen.getByRole('button', {
      name: /what's your availability/i,
    });
    const answerContainer = firstQuestion.nextElementSibling;

    // Initially should have max-h-0
    expect(answerContainer).toHaveClass('max-h-0');

    // After clicking, should have max-h-96
    fireEvent.click(firstQuestion);
    expect(answerContainer).toHaveClass('max-h-96');
  });

  it('can open multiple items sequentially', () => {
    render(<FAQ />);
    const buttons = screen.getAllByRole('button');

    // Click each button in sequence
    buttons.forEach((button, index) => {
      fireEvent.click(button);
      expect(button).toHaveAttribute('aria-expanded', 'true');

      // All previous buttons should be collapsed
      buttons.slice(0, index).forEach(prevButton => {
        expect(prevButton).toHaveAttribute('aria-expanded', 'false');
      });
    });
  });
});
