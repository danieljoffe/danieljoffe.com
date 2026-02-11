import React from 'react';
import { render, screen } from '@testing-library/react';
import PostThumbnailDescription from './PostThumbnailDescription';

describe('PostThumbnailDescription', () => {
  const defaultProps = {
    title: 'Project Title',
    description: 'Project description text',
  };

  it('renders title in an h3 element', () => {
    render(<PostThumbnailDescription {...defaultProps} />);
    const heading = screen.getByRole('heading', { level: 3 });
    expect(heading).toHaveTextContent('Project Title');
  });

  it('renders description in a paragraph element', () => {
    render(<PostThumbnailDescription {...defaultProps} />);
    const paragraph = screen.getByText('Project description text');
    expect(paragraph.tagName.toLowerCase()).toBe('p');
  });

  it('renders badges when both duration and role are provided', () => {
    render(
      <PostThumbnailDescription
        {...defaultProps}
        duration='Jun 2015 - Oct 2017'
        role='Frontend Developer'
      />
    );
    expect(screen.getByText('Jun 2015 - Oct 2017')).toBeInTheDocument();
    expect(screen.getByText('Frontend Developer')).toBeInTheDocument();
  });

  it('does not render badges when only duration is provided', () => {
    render(
      <PostThumbnailDescription
        {...defaultProps}
        duration='Jun 2015 - Oct 2017'
      />
    );
    expect(screen.queryByText('Jun 2015 - Oct 2017')).not.toBeInTheDocument();
  });

  it('does not render badges when only role is provided', () => {
    render(
      <PostThumbnailDescription {...defaultProps} role='Frontend Developer' />
    );
    expect(screen.queryByText('Frontend Developer')).not.toBeInTheDocument();
  });

  it('does not render badges when neither is provided', () => {
    const { container } = render(
      <PostThumbnailDescription {...defaultProps} />
    );
    expect(container.querySelector('[class*="badge"]')).not.toBeInTheDocument();
  });

  it('applies card styling to the container', () => {
    const { container } = render(
      <PostThumbnailDescription {...defaultProps} />
    );
    const outerDiv = container.firstChild as HTMLElement;
    expect(outerDiv.className).toContain('bg-card');
    expect(outerDiv.className).toContain('px-4');
    expect(outerDiv.className).toContain('pt-4');
    expect(outerDiv.className).toContain('pb-6');
  });
});
