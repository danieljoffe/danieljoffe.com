import React from 'react';
import { render, screen } from '@testing-library/react';
import ContentGrid from './ContentGrid';

describe('ContentGrid', () => {
  test('renders children content', () => {
    render(
      <ContentGrid>
        <div>Card 1</div>
        <div>Card 2</div>
      </ContentGrid>
    );
    expect(screen.getByText('Card 1')).toBeInTheDocument();
    expect(screen.getByText('Card 2')).toBeInTheDocument();
  });

  test('applies grid layout classes', () => {
    render(
      <ContentGrid>
        <div data-testid='child'>Content</div>
      </ContentGrid>
    );
    const grid = screen.getByText('Content').parentElement;
    expect(grid?.className).toContain('grid');
    expect(grid?.className).toContain('grid-cols-1');
  });

  test('applies responsive grid classes', () => {
    render(
      <ContentGrid>
        <div>Content</div>
      </ContentGrid>
    );
    const grid = screen.getByText('Content').parentElement;
    // UI library Grid uses sm: breakpoint for 2 columns
    expect(grid?.className).toContain('sm:grid-cols-2');
    expect(grid?.className).toContain('md:grid-rows-2');
  });

  test('applies max-width and centering classes', () => {
    render(
      <ContentGrid>
        <div>Content</div>
      </ContentGrid>
    );
    const grid = screen.getByText('Content').parentElement;
    expect(grid?.className).toContain('max-w-[30rem]');
    expect(grid?.className).toContain('mx-auto');
  });

  test('applies gap styling', () => {
    render(
      <ContentGrid>
        <div>Content</div>
      </ContentGrid>
    );
    const grid = screen.getByText('Content').parentElement;
    // UI library Grid gap='lg' uses sm:gap-8
    expect(grid?.className).toContain('sm:gap-8');
  });

  test('renders as semantic ul element', () => {
    render(
      <ContentGrid>
        <li>Item 1</li>
      </ContentGrid>
    );
    const grid = screen.getByText('Item 1').parentElement;
    expect(grid?.nodeName).toBe('UL');
  });

  test('renders multiple grid items', () => {
    render(
      <ContentGrid>
        <div>Item 1</div>
        <div>Item 2</div>
        <div>Item 3</div>
        <div>Item 4</div>
      </ContentGrid>
    );
    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.getByText('Item 2')).toBeInTheDocument();
    expect(screen.getByText('Item 3')).toBeInTheDocument();
    expect(screen.getByText('Item 4')).toBeInTheDocument();
  });
});
