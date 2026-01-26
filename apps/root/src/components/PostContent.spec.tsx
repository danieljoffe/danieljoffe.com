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

  test('renders headings within prose container', () => {
    render(
      <PostContent>
        <h2>Heading</h2>
      </PostContent>
    );
    const heading = screen.getByText('Heading');
    expect(heading.tagName.toLowerCase()).toBe('h2');
    expect(heading.parentElement?.className).toContain('prose');
  });

  test('renders body text within prose container', () => {
    render(
      <PostContent>
        <p>Body text</p>
      </PostContent>
    );
    const bodyText = screen.getByText('Body text');
    expect(bodyText.tagName.toLowerCase()).toBe('p');
    expect(bodyText.parentElement?.className).toContain('prose');
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
