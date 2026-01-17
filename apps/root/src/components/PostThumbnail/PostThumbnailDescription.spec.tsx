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

  test('applies text styling', () => {
    const { container } = render(
      <PostThumbnailDescription title='Title' description='Desc' />
    );
    const outerDiv = container.firstChild;
    expect((outerDiv as HTMLElement)?.className).toContain('text-white');
    expect((outerDiv as HTMLElement)?.className).toContain('overflow-hidden');
  });

  test('applies minimum height for consistent card sizing', () => {
    const { container } = render(
      <PostThumbnailDescription title='Title' description='Desc' />
    );
    const outerDiv = container.firstChild;
    expect((outerDiv as HTMLElement)?.className).toContain('min-h-[15rem]');
  });

  test('applies backdrop blur styling to inner container', () => {
    const { container } = render(
      <PostThumbnailDescription title='Title' description='Desc' />
    );
    const innerDiv = container.querySelector('.backdrop-blur-md');
    expect(innerDiv).toBeInTheDocument();
  });

  test('applies shadow styling', () => {
    const { container } = render(
      <PostThumbnailDescription title='Title' description='Desc' />
    );
    const innerDiv = container.querySelector('.shadow-lg');
    expect(innerDiv).toBeInTheDocument();
  });

  test('applies padding styling', () => {
    const { container } = render(
      <PostThumbnailDescription title='Title' description='Desc' />
    );
    const outerDiv = container.firstChild;
    expect((outerDiv as HTMLElement)?.className).toContain('px-4');
    expect((outerDiv as HTMLElement)?.className).toContain('pt-6');
    expect((outerDiv as HTMLElement)?.className).toContain('pb-8');
  });
});
