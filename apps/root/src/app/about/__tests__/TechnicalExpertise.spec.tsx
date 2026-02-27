import React from 'react';
import { render, screen } from '@testing-library/react';
import TechnicalExpertise from '../TechnicalExpertise';
import { expertiseCategories } from '@/data/about';

describe('TechnicalExpertise', () => {
  it('renders section heading', () => {
    render(<TechnicalExpertise />);
    const heading = screen.getByRole('heading', {
      name: /technical expertise/i,
    });
    expect(heading).toBeInTheDocument();
    expect(heading.tagName.toLowerCase()).toBe('h2');
  });

  it('has an aria-labelledby pointing to the heading', () => {
    const { container } = render(<TechnicalExpertise />);
    const section = container.querySelector(
      '[aria-labelledby="technical-expertise-heading"]'
    );
    expect(section).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /technical expertise/i })
    ).toHaveAttribute('id', 'technical-expertise-heading');
  });

  it('renders all expertise categories', () => {
    render(<TechnicalExpertise />);
    for (const category of expertiseCategories) {
      expect(
        screen.getByRole('heading', { name: category.label })
      ).toBeInTheDocument();
    }
  });

  it('renders skills as badges within each category', () => {
    render(<TechnicalExpertise />);
    for (const category of expertiseCategories) {
      for (const skill of category.skills) {
        expect(screen.getByText(skill)).toBeInTheDocument();
      }
    }
  });

  it('renders the correct number of category cards', () => {
    render(<TechnicalExpertise />);
    const categoryHeadings = screen.getAllByRole('heading', { level: 3 });
    expect(categoryHeadings).toHaveLength(expertiseCategories.length);
  });
});
