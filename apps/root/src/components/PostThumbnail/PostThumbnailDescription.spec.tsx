import React from 'react';
import { render, screen } from '@testing-library/react';
import PostThumbnailDescription from './PostThumbnailDescription';

describe('PostThumbnailDescription', () => {
  test('renders title', () => {
    render(
      <PostThumbnailDescription
        title='Project Title'
        description='Description'
      />
    );
    expect(screen.getByText('Project Title')).toBeInTheDocument();
  });

  test('renders description', () => {
    render(
      <PostThumbnailDescription
        title='Title'
        description='Project description text'
      />
    );
    expect(screen.getByText('Project description text')).toBeInTheDocument();
  });

  test('renders title in h3 element', () => {
    render(
      <PostThumbnailDescription title='Heading Title' description='Desc' />
    );
    const heading = screen.getByRole('heading', { level: 3 });
    expect(heading).toHaveTextContent('Heading Title');
  });

  test('renders description in paragraph element', () => {
    render(
      <PostThumbnailDescription title='Title' description='Para description' />
    );
    const paragraph = screen.getByText('Para description');
    expect(paragraph.tagName.toLowerCase()).toBe('p');
  });

  test('renders duration badge when provided', () => {
    render(
      <PostThumbnailDescription
        title='Title'
        description='Desc'
        duration='Jun 2015 - Oct 2017'
      />
    );
    expect(screen.getByText('Jun 2015 - Oct 2017')).toBeInTheDocument();
  });

  test('renders role when provided', () => {
    render(
      <PostThumbnailDescription
        title='Title'
        description='Desc'
        role='Frontend Developer'
      />
    );
    expect(screen.getByText('Frontend Developer')).toBeInTheDocument();
  });

  test('does not render duration badge when not provided', () => {
    const { container } = render(
      <PostThumbnailDescription title='Title' description='Desc' />
    );
    const badge = container.querySelector('.inline-flex');
    expect(badge).not.toBeInTheDocument();
  });

  test('does not render role when not provided', () => {
    render(<PostThumbnailDescription title='Title' description='Desc' />);
    const paragraphs = screen.getAllByText((_, element) => {
      return element?.tagName.toLowerCase() === 'p';
    });
    // Only the description paragraph should be present
    expect(paragraphs).toHaveLength(1);
  });

  test('applies card background styling', () => {
    const { container } = render(
      <PostThumbnailDescription title='Title' description='Desc' />
    );
    const outerDiv = container.firstChild;
    expect((outerDiv as HTMLElement)?.className).toContain('bg-card');
  });

  test('applies padding styling', () => {
    const { container } = render(
      <PostThumbnailDescription title='Title' description='Desc' />
    );
    const outerDiv = container.firstChild;
    expect((outerDiv as HTMLElement)?.className).toContain('px-4');
    expect((outerDiv as HTMLElement)?.className).toContain('pt-4');
    expect((outerDiv as HTMLElement)?.className).toContain('pb-6');
  });
});
