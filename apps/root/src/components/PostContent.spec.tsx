import React from 'react';
import { render, screen } from '@testing-library/react';
import PostContent from './PostContent';

describe('PostContent', () => {
  test('renders children content', () => {
    render(
      <PostContent>
        <h1>Article Title</h1>
        <p>Article content</p>
      </PostContent>
    );
    expect(screen.getByText('Article Title')).toBeInTheDocument();
    expect(screen.getByText('Article content')).toBeInTheDocument();
  });

  test('wraps content in Container component', () => {
    const { container } = render(
      <PostContent>
        <p>Content</p>
      </PostContent>
    );
    // Container applies max-w-3xl (sm size) and centering styles
    const containerElement = container.firstChild;
    expect(containerElement).toHaveClass('mx-auto', 'max-w-3xl');
  });

  test('applies prose typography classes', () => {
    render(
      <PostContent>
        <p>Styled content</p>
      </PostContent>
    );
    const proseContainer = screen.getByText('Styled content').parentElement;
    expect(proseContainer?.className).toContain('prose');
    expect(proseContainer?.className).toContain('prose-base');
  });

  test('applies heading font styling', () => {
    render(
      <PostContent>
        <h2>Heading</h2>
      </PostContent>
    );
    const proseContainer = screen.getByText('Heading').parentElement;
    expect(proseContainer?.className).toContain('prose-headings:font-sans');
    expect(proseContainer?.className).toContain('prose-headings:font-medium');
  });

  test('applies body font styling', () => {
    render(
      <PostContent>
        <p>Body text</p>
      </PostContent>
    );
    const proseContainer = screen.getByText('Body text').parentElement;
    expect(proseContainer?.className).toContain('prose-body:font-serif');
  });

  test('applies full width to prose container', () => {
    render(
      <PostContent>
        <p>Content</p>
      </PostContent>
    );
    const proseContainer = screen.getByText('Content').parentElement;
    expect(proseContainer?.className).toContain('w-full');
  });

  test('renders complex nested content', () => {
    render(
      <PostContent>
        <h1>Main Title</h1>
        <p>Introduction paragraph</p>
        <h2>Section</h2>
        <ul>
          <li>Item 1</li>
          <li>Item 2</li>
        </ul>
      </PostContent>
    );
    expect(screen.getByText('Main Title')).toBeInTheDocument();
    expect(screen.getByText('Introduction paragraph')).toBeInTheDocument();
    expect(screen.getByText('Section')).toBeInTheDocument();
    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.getByText('Item 2')).toBeInTheDocument();
  });
});
