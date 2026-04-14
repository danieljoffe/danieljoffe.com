import React from 'react';
import { render, screen } from '@testing-library/react';
import { CoverImage } from './CoverImage';

describe('CoverImage', () => {
  it('renders an image with alt text', () => {
    render(<CoverImage src='/images/covers/test.webp' alt='Test cover' />);

    expect(screen.getByAltText('Test cover')).toBeInTheDocument();
  });

  it('applies priority when set to true', () => {
    render(
      <CoverImage
        src='/images/covers/test.webp'
        alt='Priority cover'
        priority={true}
      />
    );

    expect(screen.getByAltText('Priority cover')).toBeInTheDocument();
  });
});
